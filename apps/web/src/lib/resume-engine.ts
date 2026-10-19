// Real ATS Resume Analysis Engine

import type { ResumeAnalysis, WeakBullet } from "@/types";
import { generateId } from "@/lib/utils";

// ─── Weak verb detection ───────────────────────────────────────────────────
const WEAK_VERBS: string[] = [
  "led", "managed", "handled", "worked", "helped", "assisted", "responsible",
  "was", "were", "did", "made", "used", "got", "had", "done", "oversaw",
  "participated", "involved", "contributed", "supported", "maintained",
  "worked on", "dealt with", "took care of", "in charge of", "ensured",
  "processed", "reviewed", "monitored", "coordinated", "facilitated",
];

const STRONG_VERB_MAP: Record<string, string> = {
  "led": "Directed",
  "managed": "Orchestrated",
  "worked": "Delivered",
  "helped": "Enabled",
  "assisted": "Collaborated with",
  "responsible for": "Owned",
  "participated": "Contributed to",
  "oversaw": "Supervised",
  "maintained": "Optimized",
  "coordinated": "Aligned",
};

// ─── Multi-Role ATS Keywords Taxonomies ──────────────────────────────────
export const ROLE_KEYWORD_TAXONOMY: Record<string, { name: string; keywords: string[] }> = {
  "software-engineer": {
    name: "Software Engineer",
    keywords: [
      "TypeScript", "JavaScript", "Python", "React", "Node.js", "Java", "C++",
      "AWS", "Docker", "Kubernetes", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
      "REST API", "Microservices", "CI/CD", "Git", "Agile", "Distributed Systems",
      "Scalability", "Performance Optimization", "System Design", "Data Structures", "Algorithms",
    ],
  },
  "frontend-engineer": {
    name: "Frontend Engineer",
    keywords: [
      "React", "Next.js", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS",
      "Redux", "Zustand", "State Management", "Web Vitals", "Performance Optimization",
      "Responsive Design", "REST APIs", "GraphQL", "Jest", "Cypress", "UI/UX", "Webpack", "Vite",
    ],
  },
  "backend-engineer": {
    name: "Backend Engineer",
    keywords: [
      "Node.js", "Python", "Go", "Java", "PostgreSQL", "MySQL", "MongoDB", "Redis",
      "REST API", "GraphQL", "gRPC", "Microservices", "System Design", "Kafka", "RabbitMQ",
      "Docker", "Kubernetes", "AWS", "CI/CD", "ORM", "Caching", "Authentication & OAuth",
    ],
  },
  "fullstack-engineer": {
    name: "Full Stack Engineer",
    keywords: [
      "React", "Next.js", "Node.js", "TypeScript", "JavaScript", "PostgreSQL", "MongoDB",
      "REST APIs", "GraphQL", "AWS", "Docker", "CI/CD", "Tailwind CSS", "Express.js",
      "System Design", "Microservices", "Web Vitals", "Unit Testing", "Git",
    ],
  },
  "ai-engineer": {
    name: "AI / ML Engineer",
    keywords: [
      "Python", "PyTorch", "TensorFlow", "Large Language Models", "LLMs", "RAG",
      "LangChain", "Vector Databases", "Pinecone", "Transformers", "HuggingFace",
      "Prompt Engineering", "Fine-tuning", "Scikit-learn", "NLP", "Computer Vision",
      "MLOps", "Model Deployment", "FastAPI", "Pandas", "NumPy",
    ],
  },
  "cloud-engineer": {
    name: "Cloud / DevOps Engineer",
    keywords: [
      "AWS", "GCP", "Azure", "Terraform", "CloudFormation", "Docker", "Kubernetes",
      "CI/CD", "GitHub Actions", "Jenkins", "Linux", "Bash Scripting", "Prometheus",
      "Grafana", "Site Reliability", "SRE", "Infrastructure as Code", "Networking & VPC",
    ],
  },
  "cybersecurity-engineer": {
    name: "Cybersecurity Engineer",
    keywords: [
      "OWASP", "Application Security", "IAM", "Penetration Testing", "SOC2", "SIEM",
      "Encryption", "Vulnerability Assessment", "Network Security", "Threat Modeling",
      "Firewalls", "Incident Response", "Compliance", "Identity Management",
    ],
  },
  "data-scientist": {
    name: "Data Scientist / Analyst",
    keywords: [
      "Python", "SQL", "R", "Pandas", "NumPy", "Scikit-learn", "Machine Learning",
      "Tableau", "Power BI", "Statistics", "A/B Testing", "Data Visualization",
      "Jupyter", "ETL Pipelines", "Data Mining", "Predictive Modeling",
    ],
  },
  "product-manager": {
    name: "Product Manager",
    keywords: [
      "Product Strategy", "User Research", "Roadmapping", "OKRs", "Agile / Scrum",
      "Product Analytics", "Feature Scoping", "Stakeholder Management", "Key Metrics & KPIs",
      "User Stories", "Wireframing", "A/B Testing", "Jira", "Go-To-Market",
    ],
  },
  "ux-designer": {
    name: "UX / UI Designer",
    keywords: [
      "Figma", "User Research", "Wireframing", "Prototyping", "Design Systems",
      "Information Architecture", "User Testing", "Adobe XD", "Interaction Design",
      "Accessibility & WCAG", "User Journey Mapping", "UI Kits", "Usability Testing",
    ],
  },
  "financial-analyst": {
    name: "Financial / Business Analyst",
    keywords: [
      "Financial Modeling", "Excel & VBA", "Financial Analysis", "Forecasting",
      "Valuation", "Business Strategy", "Variance Analysis", "Budgeting", "SQL",
      "Data Analysis", "Risk Management", "Corporate Finance", "Reporting",
    ],
  },
  "marketing-manager": {
    name: "Marketing & Growth Specialist",
    keywords: [
      "SEO", "SEM", "Content Marketing", "Google Analytics", "Lead Generation",
      "Campaign Management", "Conversion Rate Optimization", "CRO", "Email Marketing",
      "Social Media Marketing", "Copywriting", "Paid Ads", "HubSpot",
    ],
  },
  "qa-engineer": {
    name: "QA & Automation Engineer",
    keywords: [
      "Selenium", "Cypress", "Playwright", "Jest", "Test Automation", "QA Testing",
      "Bug Tracking", "Postman", "API Testing", "Regression Testing", "Jira",
      "Integration Testing", "Test Plans", "CI/CD Integration",
    ],
  },
  "solutions-architect": {
    name: "Solutions Architect",
    keywords: [
      "Enterprise Architecture", "System Design", "Cloud Security", "Technical Strategy",
      "Solution Scoping", "Integration Design", "Scalability", "Microservices",
      "Disaster Recovery", "Vendor Management", "Multi-Tenant Architecture",
    ],
  },
  "startup-founder": {
    name: "Startup Founder",
    keywords: [
      "MVP Scoping", "Pitch Deck", "Go-To-Market", "Unit Economics", "Product-Market Fit",
      "Fundraising", "Business Model", "Growth Hacking", "Customer Acquisition",
      "P&L Management", "Strategic Partnerships", "Outreach Automation",
    ],
  },
};

const KEYWORD_ALIASES: Record<string, string[]> = {
  "Node.js": ["NodeJS", "Node JS"],
  "Next.js": ["NextJS", "Next JS"],
  "React": ["ReactJS", "React JS"],
  "REST API": ["REST APIs", "RESTful API", "RESTful APIs"],
  "PostgreSQL": ["Postgres"],
  "Kubernetes": ["K8s"],
  "CI/CD": ["CI CD", "continuous integration", "continuous delivery", "continuous deployment"],
  "Large Language Models": ["LLM", "LLMs", "large language model"],
  "Scikit-learn": ["sklearn", "scikit learn"],
};

function keywordPattern(keyword: string): RegExp {
  const variants = [keyword, ...(KEYWORD_ALIASES[keyword] || [])];
  const alternatives = variants
    .map((variant) => variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "iu");
}

function containsKeyword(text: string, keyword: string): boolean {
  return keywordPattern(keyword).test(text);
}

function keywordImportance(keyword: string, jobDescription: string): number {
  const match = keywordPattern(keyword).exec(jobDescription);
  if (!match || match.index === undefined) return 1;

  const context = jobDescription.slice(Math.max(0, match.index - 100), match.index + match[0].length + 60);
  return /\b(required|must[- ]have|minimum|need to|you have|qualifications?)\b/i.test(context) ? 1.5 : 1;
}

export function getRoleKeywords(targetRole?: string, jobDescription?: string): { keywords: string[]; roleName: string } {
  let baseKeywords: string[] = ROLE_KEYWORD_TAXONOMY["software-engineer"].keywords;
  let roleName = "Software Engineer";

  if (targetRole && ROLE_KEYWORD_TAXONOMY[targetRole]) {
    baseKeywords = ROLE_KEYWORD_TAXONOMY[targetRole].keywords;
    roleName = ROLE_KEYWORD_TAXONOMY[targetRole].name;
  } else if (targetRole && targetRole.trim()) {
    roleName = targetRole.trim();
  }

  if (jobDescription && jobDescription.trim().length > 30) {
    const allRoleKeywords = Object.values(ROLE_KEYWORD_TAXONOMY).flatMap((role) => role.keywords);
    const catalog = Array.from(new Set([...baseKeywords, ...allRoleKeywords]));
    const jdKeywords = catalog.filter((keyword) => containsKeyword(jobDescription, keyword));
    const selectedRoleKeywords = jdKeywords.filter((keyword) => baseKeywords.includes(keyword));
    const otherRoleKeywords = jdKeywords.filter((keyword) => !baseKeywords.includes(keyword));
    const ordered = [...selectedRoleKeywords, ...otherRoleKeywords]
      .sort((a, b) =>
        keywordImportance(b, jobDescription) - keywordImportance(a, jobDescription) ||
        b.length - a.length
      );
    const occupiedRanges: Array<{ start: number; end: number }> = [];
    const customKeywords = ordered.filter((keyword) => {
      const match = keywordPattern(keyword).exec(jobDescription);
      if (!match || match.index === undefined) return false;
      const range = { start: match.index, end: match.index + match[0].length };
      if (occupiedRanges.some((occupied) => range.start < occupied.end && range.end > occupied.start)) return false;
      occupiedRanges.push(range);
      return true;
    }).slice(0, 30);

    if (customKeywords.length > 0) {
      return { keywords: customKeywords, roleName: `${roleName} (Job Description)` };
    }
  }

  return { keywords: baseKeywords, roleName };
}

// ─── Metric detection ─────────────────────────────────────────────────────
const METRIC_REGEX = /(\d+\.?\d*\s*(%|x|X|users?|customers?|requests?|ms|seconds?|minutes?|hours?|days?|months?|years?|k|M|B|\$|€|£|million|billion|thousand|hundred))/i;

const STRONG_ACTION_VERBS = new Set([
  "accelerated", "automated", "built", "created", "delivered", "deployed", "designed",
  "developed", "drove", "established", "improved", "increased", "implemented",
  "launched", "led", "migrated", "optimized", "reduced", "refactored", "scaled",
  "spearheaded", "streamlined", "transformed",
]);

const SECTION_HEADING_PATTERNS = {
  experience: /^(?:(?:professional|work|employment)\s+)?(?:experience|history|employment history|career history)(?:\s*[:—-]\s*.+)?$/i,
  education: /^(?:education|academic background|qualifications)(?:\s*[:—-]\s*.+)?$/i,
  skills: /^(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|tools)(?:\s*[:—-]\s*.+)?$/i,
  projects: /^(?:(?:selected|key|personal|academic)\s+)?(?:projects|portfolio|case studies)(?:\s*[:—-]\s*.+)?$/i,
  summary: /^(?:(?:professional|executive|career)\s+)?(?:summary|profile|objective|about me)(?:\s*[:—-]\s*.+)?$/i,
};

export interface AtsScoreBreakdown {
  keywords: number;
  sections: number;
  experience: number;
  impact: number;
  parseability: number;
}

export interface ResumeContentEvaluation {
  score: number;
  scoreBreakdown: AtsScoreBreakdown;
  sections: {
    hasExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    hasProjects: boolean;
    hasSummary: boolean;
  };
  weakBullets: WeakBullet[];
  detectedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  bulletCandidates: string[];
}

function cleanHeading(line: string): string {
  return line
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\s*[:—-]\s*$/, "")
    .trim();
}

function getSectionContent(text: string): Map<keyof typeof SECTION_HEADING_PATTERNS, string[]> {
  const sections = new Map<keyof typeof SECTION_HEADING_PATTERNS, string[]>();
  let currentSection: keyof typeof SECTION_HEADING_PATTERNS | null = null;

  for (const line of text.split(/\r?\n/)) {
    const cleaned = cleanHeading(line);
    const heading = (Object.keys(SECTION_HEADING_PATTERNS) as Array<keyof typeof SECTION_HEADING_PATTERNS>)
      .find((section) => SECTION_HEADING_PATTERNS[section].test(cleaned));
    if (heading) {
      currentSection = heading;
      if (!sections.has(heading)) sections.set(heading, []);
      const contentOnHeadingLine = cleaned.match(/^[^:—-]+[:—-]\s*(.+)$/)?.[1];
      if (contentOnHeadingLine) sections.get(heading)?.push(contentOnHeadingLine.trim());
      continue;
    }
    if (currentSection && line.trim()) sections.get(currentSection)?.push(line.trim());
  }

  return sections;
}

function isQuantified(text: string): boolean {
  return METRIC_REGEX.test(text) ||
    /\b(?:from\s+)?\d[\d,.]*\s*(?:to|->|–|—)\s*\d[\d,.]*/i.test(text) ||
    /[$€£]\s*\d[\d,.]*(?:\s*(?:k|m|b|million|billion))?\b/i.test(text);
}

function extractBulletCandidates(text: string, sectionContent: Map<keyof typeof SECTION_HEADING_PATTERNS, string[]>): string[] {
  const experienceLines = [
    ...(sectionContent.get("experience") || []),
    ...(sectionContent.get("projects") || []),
  ];
  const source = experienceLines.length > 0 ? experienceLines : text.split(/\r?\n/);
  const markedBullets = source
    .filter((line) => /^\s*[-*•]\s+/.test(line))
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""));
  if (markedBullets.length > 0) return markedBullets.filter((line) => line.length >= 20);

  const actionStarts = new Set(Array.from(STRONG_ACTION_VERBS).concat(WEAK_VERBS));
  return source
    .map((line) => line.trim())
    .filter((line) => {
      const firstWord = line.toLowerCase().match(/^[a-z]+/)?.[0];
      return line.length >= 40 && Boolean(firstWord && actionStarts.has(firstWord));
    });
}

export function evaluateResumeContent(
  text: string,
  targetRole?: string,
  jobDescription?: string
): ResumeContentEvaluation {
  const { keywords } = getRoleKeywords(targetRole, jobDescription);
  const sectionContent = getSectionContent(text);
  const headings = Object.fromEntries(
    (Object.keys(SECTION_HEADING_PATTERNS) as Array<keyof typeof SECTION_HEADING_PATTERNS>)
      .map((section) => [section, (sectionContent.get(section) || []).some((line) => line.trim().length > 0)])
  ) as Record<keyof typeof SECTION_HEADING_PATTERNS, boolean>;
  const sections = {
    hasExperience: headings.experience,
    hasEducation: headings.education,
    hasSkills: headings.skills,
    hasProjects: headings.projects,
    hasSummary: headings.summary,
  };

  const detectedKeywords = keywords.filter((keyword) => containsKeyword(text, keyword));
  const missingKeywords = keywords.filter((keyword) => !detectedKeywords.includes(keyword));
  const useJobDescription = Boolean(
    jobDescription &&
    jobDescription.trim().length > 30 &&
    keywords.some((keyword) => containsKeyword(jobDescription, keyword))
  );
  const weights = keywords.map((keyword) => useJobDescription ? keywordImportance(keyword, jobDescription!) : 1);
  const matchedWeight = keywords.reduce((sum, keyword, index) =>
    sum + (detectedKeywords.includes(keyword) ? weights[index] : 0), 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const keywordScore = totalWeight ? Math.round((matchedWeight / totalWeight) * 45) : 0;

  const bulletCandidates = extractBulletCandidates(text, sectionContent);
  const weakBullets = detectWeakBullets(bulletCandidates);
  const hasBullets = bulletCandidates.length > 0;
  const actionBulletCount = bulletCandidates.filter((bullet) => {
    const firstWord = bullet.toLowerCase().match(/^[a-z]+/)?.[0];
    return firstWord ? STRONG_ACTION_VERBS.has(firstWord) : false;
  }).length;
  const quantifiedBulletCount = bulletCandidates.filter(isQuantified).length;
  const actionRatio = hasBullets ? actionBulletCount / bulletCandidates.length : 0;
  const quantifiedRatio = hasBullets ? quantifiedBulletCount / bulletCandidates.length : 0;
  const impactScore = hasBullets
    ? Math.round(Math.min(7, actionRatio * 7) + Math.min(8, quantifiedRatio * 8))
    : 0;

  const sectionScore =
    (sections.hasExperience ? 5 : 0) +
    (sections.hasSkills ? 4 : 0) +
    (sections.hasEducation ? 2 : 0) +
    (sections.hasSummary ? 2 : 0) +
    (sections.hasProjects ? 2 : 0);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const parseabilityScore =
    (wordCount >= 80 ? 2 : wordCount >= 30 ? 1 : 0) +
    (wordCount >= 250 ? 2 : wordCount >= 120 ? 1 : 0) +
    (/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/i.test(text) ? 1 : 0);

  const experienceDepth = Math.min(20, Math.round(
    Math.min(8, bulletCandidates.length * 1.6) +
    (sections.hasExperience ? 6 : 0) +
    (sections.hasProjects ? Math.min(3, (sectionContent.get("projects") || []).filter((line) => line.length >= 25).length) : 0) +
    (/\b(?:19|20)\d{2}\b/.test(text) ? 3 : 0)
  ));

  const scoreBreakdown: AtsScoreBreakdown = {
    keywords: keywordScore,
    sections: sectionScore,
    experience: experienceDepth,
    impact: impactScore,
    parseability: Math.min(5, parseabilityScore),
  };
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);

  const recommendations: string[] = [];
  if (missingKeywords.length > 0) {
    recommendations.push(
      `Add relevant missing skills only when you have them: ${missingKeywords.slice(0, 5).join(", ")}.`
    );
  }
  if (!sections.hasExperience) recommendations.push("Add a clearly labeled Experience section, or Relevant Experience for early-career roles.");
  if (!sections.hasSkills) recommendations.push("Add a clearly labeled Skills section with the tools and technologies you can confidently use.");
  if (!sections.hasEducation) recommendations.push("Add an Education section with your qualification and institution.");
  if (!sections.hasSummary) recommendations.push("Add a concise role-specific summary that reflects your actual experience.");
  if (hasBullets && actionRatio < 0.5) recommendations.push("Start accomplishment bullets with precise action verbs that describe what you personally did.");
  if (hasBullets && quantifiedRatio < 0.3) recommendations.push("Where you have reliable evidence, add real outcomes such as scale, time saved, quality, revenue, or performance.");
  if (bulletCandidates.length < 3) recommendations.push("Add more specific accomplishment bullets under Experience or Projects to show relevant evidence.");
  if (wordCount < 120) recommendations.push("The extracted resume text is very short; check that the uploaded file's text was parsed correctly.");
  if (recommendations.length === 0) recommendations.push("Your resume shows strong alignment and clear evidence for this target. Review each detail for accuracy before applying.");

  return {
    score,
    scoreBreakdown,
    sections,
    weakBullets,
    detectedKeywords,
    missingKeywords,
    recommendations,
    bulletCandidates,
  };
}

function detectWeakBullets(lines: string[]): WeakBullet[] {
  const results: WeakBullet[] = [];

  for (const line of lines) {
    if (line.trim().length < 20) continue;
    const lower = line.toLowerCase().trim();

    // Check for weak verb at start
    let weakVerb: string | null = null;
    for (const verb of WEAK_VERBS) {
      if (lower.startsWith(verb + " ") || lower.startsWith(verb.toLowerCase() + " ")) {
        weakVerb = verb;
        break;
      }
    }

    if (weakVerb) {
      const strongVerb = STRONG_VERB_MAP[weakVerb] || "Delivered";
      const rest = line.trim().slice(weakVerb.length).trim();
      results.push({
        original: line.trim(),
        issue: "passive_verb",
        suggested: `${strongVerb} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`,
      });
      continue;
    }

    // Check for missing metrics
    if (line.length > 40 && !isQuantified(line)) {
      results.push({
        original: line.trim(),
        issue: "no_metric",
        suggested: line.trim() + " [Add a genuine, verifiable result or metric if available.]",
      });
    }
  }

  return results.slice(0, 10); // cap at 10
}

export async function analyzeResumeText(
  rawText: string,
  fileName: string,
  config?: any,
  options?: { targetRole?: string; jobDescription?: string; agentId?: string }
): Promise<ResumeAnalysis> {
  const { targetRole = "software-engineer", jobDescription = "", agentId = "ats-resume-reviewer" } = options || {};
  const { keywords: activeKeywords, roleName: targetRoleName } = getRoleKeywords(targetRole, jobDescription);
  const evaluation = evaluateResumeContent(rawText, targetRole, jobDescription);

  // If running in browser, delegate to server API for real AI evaluation
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/resume/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          fileName,
          config,
          targetRole,
          jobDescription,
          agentId,
        }),
      });
      if (res.ok) {
        const analysis = await res.json();
        if (analysis && typeof analysis.overallScore === "number") return analysis as ResumeAnalysis;
        throw new Error("Resume evaluation returned an invalid result.");
      }
      const response = await res.json().catch(() => null);
      throw new Error(response?.error || `Resume evaluation failed (${res.status}).`);
    } catch (err) {
      console.error("Server-side resume evaluation failed, falling back to scanner", err);
    }
  }

  const atsScore = evaluation.score;
  const starAnalysis: ResumeAnalysis["starAnalysis"] = [];
  const missingSkills = evaluation.missingKeywords.slice(0, 5);

  return {
    id: generateId(),
    fileName,
    rawText,
    overallScore: atsScore,
    atsScore,
    targetRole,
    targetRoleName,
    jobDescription,
    agentId,
    sections: evaluation.sections,
    weakBullets: evaluation.weakBullets,
    missingKeywords: evaluation.missingKeywords.slice(0, 10),
    detectedKeywords: evaluation.detectedKeywords,
    scoreBreakdown: evaluation.scoreBreakdown,
    starAnalysis,
    missingSkills,
    recommendations: evaluation.recommendations,
    analyzedAt: new Date().toISOString(),
  };
}
