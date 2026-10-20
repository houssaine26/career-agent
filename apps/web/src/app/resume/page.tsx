"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, CheckCircle, AlertCircle,
  Loader2, X, Target, Sparkles, ArrowRight, Eye
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/topbar";
import { useStore } from "@/lib/store";
import { useGatewayStore } from "@/lib/gateway-store";
import { analyzeResumeText } from "@/lib/resume-engine";
import { cn, scoreToGrade, scoreToBgColor } from "@/lib/utils";
import { LiveResumePreviewModal } from "@/components/resume/LiveResumePreviewModal";

const ROLE_OPTIONS = [
  { id: "software-engineer", label: "Software Engineer", category: "Engineering" },
  { id: "frontend-engineer", label: "Frontend Engineer", category: "Engineering" },
  { id: "backend-engineer", label: "Backend Engineer", category: "Engineering" },
  { id: "fullstack-engineer", label: "Full Stack Engineer", category: "Engineering" },
  { id: "ai-engineer", label: "AI / ML Engineer", category: "AI & Data" },
  { id: "data-scientist", label: "Data Scientist / Analyst", category: "AI & Data" },
  { id: "cloud-engineer", label: "Cloud / DevOps Engineer", category: "Infrastructure" },
  { id: "cybersecurity-engineer", label: "Cybersecurity Engineer", category: "Infrastructure" },
  { id: "solutions-architect", label: "Solutions Architect", category: "Architecture" },
  { id: "product-manager", label: "Product Manager", category: "Product & Business" },
  { id: "ux-designer", label: "UX / UI Designer", category: "Product & Business" },
  { id: "financial-analyst", label: "Financial / Business Analyst", category: "Product & Business" },
  { id: "marketing-manager", label: "Marketing & Growth", category: "Product & Business" },
  { id: "qa-engineer", label: "QA & Test Automation", category: "Engineering" },
  { id: "startup-founder", label: "Startup Founder", category: "Entrepreneurship" },
];

type Step = "upload" | "analyzing" | "results";

export default function ResumePage() {
  const resumeAnalysis = useStore((s) => s.resumeAnalysis);
  const setResumeAnalysis = useStore((s) => s.setResumeAnalysis);
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);

  const [step, setStep] = useState<Step>(resumeAnalysis ? "results" : "upload");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [targetRole, setTargetRole] = useState(profile?.targetRole || "software-engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [showJdInput, setShowJdInput] = useState(false);

  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // Sync step with store when page mounts or rehydrates
  useEffect(() => {
    if (resumeAnalysis && step === "upload" && !analyzing) {
      setStep("results");
    }
  }, [resumeAnalysis, step, analyzing]);

  const processText = useCallback(async (text: string, name: string = "resume.txt", customRole?: string) => {
    const roleToUse = customRole || targetRole;
    const jdToUse = jobDescription;

    setStep("analyzing");
    setAnalyzing(true);
    try {
      const activeProvider = useGatewayStore.getState().activeProvider;
      const activeModel = useGatewayStore.getState().activeModel;
      const gatewayConfig = {
        provider: activeProvider,
        model: activeModel,
        apiKey: settings.keys?.[activeProvider]?.[0] || settings.aiProvider.apiKey,
        baseUrl: settings.baseUrls?.[activeProvider] || settings.aiProvider.baseUrl,
        temperature: useGatewayStore.getState().temperature,
        maxTokens: useGatewayStore.getState().maxTokens,
      };
      const analysis = await analyzeResumeText(text, name, gatewayConfig as any, {
        targetRole: roleToUse,
        jobDescription: jdToUse,
      });
      setResumeAnalysis(analysis);
      setStep("results");
      toast.success(`Analysis complete — ${analysis.overallScore}% ATS score for ${analysis.targetRoleName || "Target Role"}`);
    } catch (e) {
      console.error(e);
      toast.error("Analysis failed. Please try again.");
      setStep("upload");
    } finally {
      setAnalyzing(false);
    }
  }, [targetRole, jobDescription, setResumeAnalysis, settings.keys, settings.baseUrls, settings.aiProvider]);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setStep("analyzing");
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "File parsing failed.");
      }
      await processText(data.text, file.name);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file.");
      setStep("upload");
      setAnalyzing(false);
    }
  }, [processText]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/rtf": [".rtf"],
      "application/json": [".json"],
    },
    multiple: false,
  });

  const analysis = resumeAnalysis;

  return (
    <div className="flex flex-col h-full overflow-auto bg-[#03060f] text-slate-100 font-sans">
      <Topbar
        title="Resume Studio"
        subtitle="Review your resume, find role-specific gaps, and improve your real content"
      />

      {/* Preview only the resume text provided by the user. */}
      <LiveResumePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        resumeText={analysis?.rawText || ""}
      />

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        <AnimatePresence mode="wait">
          {/* Upload step */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              {/* Header card */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-xl">
                  <FileText className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Improve your resume for a target role</h2>
                <p className="text-xs text-slate-400">
                  Review section coverage and role keywords. Use suggestions only when they accurately reflect your experience.
                </p>
              </div>

              {/* Target role and optional job description */}
              <Card className="glass border-cyan-500/30 p-4 space-y-3 bg-slate-900/60">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Target role</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-secondary/80 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional JD toggle */}
                <div className="pt-2 border-t border-border/40">
                  <button
                    onClick={() => setShowJdInput(!showJdInput)}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{showJdInput ? "Hide job description" : "Add a job description for a more specific match"}</span>
                  </button>

                  {showJdInput && (
                    <textarea
                      className="w-full h-24 mt-2 p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                      placeholder="Paste the job description to compare its requirements with your resume..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  )}
                </div>
              </Card>

              {/* Drag & drop upload box */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/70 shadow-lg",
                  isDragActive ? "border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/20" : "border-border/80 hover:border-cyan-500/40"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-bounce" />
                <p className="text-sm font-bold text-white">Choose or drop your resume</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DOC, Markdown, TXT, or JSON</p>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl border-border/60" onClick={() => setPasteMode(!pasteMode)}>
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  {pasteMode ? "Hide paste option" : "Or paste resume text"}
                </Button>
              </div>

              {pasteMode && (
                <div className="space-y-2 pt-2">
                  <textarea
                    className="w-full h-36 p-3 rounded-xl bg-secondary/50 border border-border text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                    placeholder="Paste resume plain text here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <Button
                    onClick={() => processText(pastedText, "pasted-resume.txt")}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs h-9 rounded-xl"
                    disabled={!pastedText.trim()}
                  >
                    Analyze Pasted Text
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Analyzing step */}
          {step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-white">Resume Analysis in Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Parsing section headers, evaluating STAR bullet formulas, and indexing keywords...
                </p>
              </div>
            </motion.div>
          )}

          {/* Results Step */}
          {step === "results" && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Top Banner & Fast Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-border/60">
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-2xl text-center border font-mono shrink-0", scoreToBgColor(analysis.overallScore))}>
                    <div className="text-3xl font-bold">{analysis.overallScore}%</div>
                    <div className="text-[10px] font-sans uppercase font-bold text-muted-foreground mt-0.5">
                      {scoreToGrade(analysis.overallScore)} estimate
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Resume review complete</h3>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px]">
                        {analysis.targetRoleName || targetRole}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Heuristic estimate based on the selected role or supplied job description and evidence in the extracted resume text.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    <span>Preview uploaded resume</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResumeAnalysis(null);
                      setStep("upload");
                    }}
                    className="text-xs h-9 rounded-xl border-border/80"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    New Resume
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                  {/* Section Presence Indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(analysis.sections).map(([key, present]) => (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold",
                          present
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        )}
                      >
                        {present ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                        <span className="capitalize truncate">
                          {key.replace("has", "").replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {analysis.scoreBreakdown && (
                    <Card className="glass border-cyan-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-white">How this score is calculated</CardTitle>
                        <CardDescription className="text-xs">
                          Each category is scored separately; keyword coverage is based on your target role or recognized job requirements.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {([
                          ["keywords", "Role / JD keywords", 45],
                          ["sections", "Section coverage", 15],
                          ["experience", "Experience evidence", 20],
                          ["impact", "Bullet impact", 15],
                          ["parseability", "Text readability", 5],
                        ] as const).map(([key, label, max]) => {
                          const value = analysis.scoreBreakdown?.[key] ?? 0;
                          return (
                            <div key={key} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                              <div className="flex justify-between gap-2 text-xs">
                                <span className="text-slate-300">{label}</span>
                                <span className="font-mono font-bold text-cyan-300">{value}/{max}</span>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-cyan-400"
                                  style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations and target-role keywords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="glass border-sky-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-sky-400" />
                          <CardTitle className="text-sm font-bold text-white">Recommended improvements</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="glass border-amber-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-amber-400" />
                          <CardTitle className="text-sm font-bold text-white">Detected Keywords Density</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-[11px] font-semibold text-slate-400">Found in extracted resume text</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.detectedKeywords.map((kw) => (
                            <Badge
                              key={kw}
                              className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[11px] font-mono"
                            >
                              ✓ {kw}
                            </Badge>
                          ))}
                          {analysis.detectedKeywords.length === 0 && (
                            <span className="text-xs text-slate-500">No mapped target keywords found.</span>
                          )}
                        </div>
                        <div className="border-t border-white/10 pt-3">
                          <p className="text-[11px] font-semibold text-slate-400 mb-2">Potential gaps — include only skills you actually have</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.missingKeywords.map((kw) => (
                              <Badge
                                key={kw}
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/5 text-amber-200 text-[11px] font-mono"
                              >
                                {kw}
                              </Badge>
                            ))}
                            {analysis.missingKeywords.length === 0 && (
                              <span className="text-xs text-slate-500">No mapped keyword gaps.</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
