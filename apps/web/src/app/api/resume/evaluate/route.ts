// apps/web/src/app/api/resume/evaluate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generate } from "../../../../../../../packages/ai/router";
import { enforceRequestLimits, escapeHTML, escapeMarkdown } from "../../../../../../../packages/security";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateResumeContent, getRoleKeywords } from "@/lib/resume-engine";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const clientIp = (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1").trim();
    const limitResponse = enforceRequestLimits(req, clientIp, { isUser: !!session?.user });
    if (limitResponse) return limitResponse;

    const { text, fileName, config, targetRole = "software-engineer", jobDescription = "", agentId = "ats-resume-reviewer" } = await req.json();

    if (!text) {
      return NextResponse.json({ success: false, error: "No resume text provided" }, { status: 400 });
    }

    // Enforce 20 KB payload limit to prevent resource exhaustion / DoS
    if (text.length > 20 * 1024) {
      return NextResponse.json({
        success: false,
        error: "Resume text payload exceeds the maximum allowed size of 20 KB."
      }, { status: 400 });
    }

    const { roleName: targetRoleName } = getRoleKeywords(targetRole, jobDescription);
    const evaluation = evaluateResumeContent(text, targetRole, jobDescription);

    // Server-side usage limits gating check
    let plan: "guest" | "free" | "pro" | "team" | "enterprise" = "guest";
    let userId: string | null = null;

    try {
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, plan: true }
        });
        if (user) {
          userId = user.id;
          plan = (user.plan as any) || "free";
        }
      }
    } catch (error) {
      console.error("Prisma user lookup failed, falling back to guest:", error);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let currentScansCount = 0;
    try {
      if (userId) {
        currentScansCount = await prisma.resumeAnalysis.count({
          where: {
            userId,
            analyzedAt: { gte: startOfToday }
          }
        });
      } else {
        currentScansCount = await prisma.analyticsEvent.count({
          where: {
            sessionId: clientIp,
            eventName: "resume_scan",
            timestamp: { gte: startOfToday }
          }
        });
      }
    } catch (error) {
      console.error("Analytics database call failed (counting scans):", error);
      currentScansCount = 0; // Fallback safely
    }

    const { FeatureFlagsManager } = await import("@/lib/feature-flags");
    const allowed = FeatureFlagsManager.checkUsageLimit(plan, currentScansCount, "resume");
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: `Your plan (${plan.toUpperCase()}) daily limit has been exceeded (5 resume scans max per day). Please upgrade to Professional or Enterprise plan for unlimited resume evaluations.`
      }, { status: 429 });
    }

    // Increment guest scan telemetry in PostgreSQL
    if (!userId) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            sessionId: clientIp,
            eventName: "resume_scan",
            properties: { fileName: fileName || "resume.pdf", targetRole }
          }
        });
      } catch (error) {
        console.error("Analytics database call failed (creating scan event):", error);
      }
    }

    const sections = evaluation.sections;
    const weakBullets = evaluation.weakBullets;
    const foundKeywords = evaluation.detectedKeywords;
    const missingKeywords = evaluation.missingKeywords;
    const atsScore = evaluation.score;

    // 5. Query AI Gateway for Accomplishment Bullet Review (STAR Framework & Persona)
    const bulletsToAnalyze = evaluation.bulletCandidates.slice(0, 4);
    let starAnalysis: Array<{
      bullet: string;
      situation: string;
      task: string;
      action: string;
      result: string;
      rating: number;
    }> = [];
    
    let aiRecs: string[] = [];

    const provider = config?.provider || "gemini";
    const apiKey = config?.apiKey || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
    const hasKey = !!apiKey || ["ollama", "lmstudio"].includes(provider);

    if (hasKey && bulletsToAnalyze.length > 0) {
      try {
        const jdContext = jobDescription ? `\nTarget Job Description Snippet: "${jobDescription.slice(0, 300)}"` : "";
        const userPrompt = `Target Role: ${targetRoleName}${jdContext}\nAgent Audit ID: ${agentId}\n\nAnalyze these accomplishment bullets for ${targetRoleName} using the STAR framework:\n${bulletsToAnalyze.map((b: any, i: any) => `[Bullet ${i + 1}]: "${b}"`).join("\n")}

Only report facts directly present in the supplied bullets. Do not invent tools, actions, outcomes, percentages, or context. If a STAR element is absent, use "Not stated in the bullet." Rate only how clearly the bullet itself states its evidence. Return a JSON object matching this structure:
{
  "starAnalysis": [
    {
      "bullet": "original bullet",
      "situation": "explicit situation in the bullet, or Not stated in the bullet.",
      "task": "explicit task in the bullet, or Not stated in the bullet.",
      "action": "action explicitly stated in the bullet, or Not stated in the bullet.",
      "result": "result explicitly stated in the bullet, or Not stated in the bullet.",
      "rating": 0
    }
  ],
  "recommendations": [
    "rec 1 relevant to ${targetRoleName}",
    "rec 2 relevant to ${targetRoleName}"
  ]
}`;

        const raw = await generate({
          messages: [
            { role: "system", content: `You are an expert recruiter and career agent specializing in auditing resumes for ${targetRoleName}. Return ONLY a valid JSON block, no markdown wrappers, no conversational text.` },
            { role: "user", content: userPrompt },
          ],
          config: {
            ...config,
            provider,
            model: "default",
            apiKey,
            streaming: false,
            maxTokens: 2048,
          },
        });

        const cleanJSON = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJSON);
        if (parsed && Array.isArray(parsed.starAnalysis)) {
          starAnalysis = parsed.starAnalysis;
        }
        if (parsed && Array.isArray(parsed.recommendations)) {
          aiRecs = parsed.recommendations;
        }
      } catch (err) {
        console.error("AI STAR evaluation failed:", err);
      }
    }

    // 6. Compile Recommendations list
    const recommendations: string[] = [];
    recommendations.push(...evaluation.recommendations);
    
    aiRecs.forEach(r => {
      if (recommendations.length < 6) recommendations.push(r);
    });

    if (recommendations.length === 0) {
      recommendations.push(`Excellent work for ${targetRoleName}! Keep metrics updated as your career progresses.`);
    }

    const missingSkills = missingKeywords.slice(0, 5);
    const analysisId = `analysis-${crypto.randomBytes(3).toString("hex")}`;

    const cleanFileName = fileName || "resume.pdf";
    const cleanText = text;
    
    const cleanWeakBullets = weakBullets.map((b: any) => ({
      original: b.original,
      issue: b.issue,
      suggested: b.suggested,
    }));

    const cleanStarAnalysis = starAnalysis.map((b: any) => ({
      bullet: b.bullet,
      situation: b.situation,
      task: b.task,
      action: b.action,
      result: b.result,
      rating: typeof b.rating === "number" ? b.rating : 0,
    }));

    const cleanRecommendations = recommendations;
    const cleanFoundKeywords = foundKeywords;
    const cleanMissingKeywords = missingKeywords;

    // 7. Save to PostgreSQL if logged in
    if (session?.user) {
      try {
        const userEmail = session.user.email;
        if (userEmail) {
          const userRecord = await prisma.user.findUnique({
            where: { email: userEmail }
          });
          if (userRecord) {
            await prisma.resumeAnalysis.create({
              data: {
                userId: userRecord.id,
                fileName: cleanFileName,
                rawText: cleanText,
                overallScore: atsScore,
                atsScore,
                sections: sections as any,
                weakBullets: cleanWeakBullets as any,
                missingKeywords: cleanMissingKeywords.slice(0, 10),
                detectedKeywords: cleanFoundKeywords,
                recommendations: cleanRecommendations,
                aiRewrite: JSON.stringify(cleanStarAnalysis),
              }
            });

            await prisma.careerMetrics.upsert({
              where: { userId: userRecord.id },
              update: {
                resumeScore: atsScore,
                careerScore: Math.round((atsScore + 80 + 75 + 85) / 4),
              },
              create: {
                userId: userRecord.id,
                resumeScore: atsScore,
                careerScore: Math.round((atsScore + 80 + 75 + 85) / 4),
              }
            });
          }
        }
      } catch (dbErr) {
        console.error("Failed to save resume analysis to PostgreSQL database:", dbErr);
      }
    }

    return NextResponse.json({
      id: analysisId,
      fileName: cleanFileName,
      rawText: cleanText,
      overallScore: atsScore,
      atsScore,
      targetRole,
      targetRoleName,
      jobDescription: jobDescription || "",
      agentId,
      sections,
      weakBullets: cleanWeakBullets,
      missingKeywords: cleanMissingKeywords.slice(0, 10),
      detectedKeywords: cleanFoundKeywords,
      scoreBreakdown: evaluation.scoreBreakdown,
      starAnalysis: cleanStarAnalysis,
      missingSkills,
      recommendations: cleanRecommendations,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const reqId = "REQ-" + Math.floor(10000 + Math.random() * 90000);
    console.error(`[${reqId}] Resume evaluate API failed:`, err);
    return NextResponse.json({ 
      error: `Unable to evaluate because AI provider is unavailable. Reference ID: ${reqId}. Please try again.` 
    }, { status: 500 });
  }
}
