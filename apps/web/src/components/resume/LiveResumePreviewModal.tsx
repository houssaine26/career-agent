"use client";

import { useState } from "react";
import { Check, Copy, FileText, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LiveResumePreviewModal({
  resumeText,
  open = false,
  onClose,
}: {
  resumeText: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyResumeText() {
    try {
      await navigator.clipboard.writeText(resumeText);
      setCopied(true);
      toast.success("Resume text copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy resume text", error);
      toast.error("Could not copy the resume text.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-preview-title"
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-resume, #printable-resume * { visibility: visible !important; }
          #printable-resume {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: #0f172a !important;
          }
        }
      `}</style>
      <div className="my-8 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#0a0f1d] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="resume-preview-title" className="text-sm font-bold text-white">Uploaded resume preview</h2>
              <p className="text-xs text-muted-foreground">Showing the text extracted from your file; no resume details are generated here.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={copyResumeText} variant="outline" className="h-8 text-xs">
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              Copy text
            </Button>
            <Button size="sm" onClick={() => window.print()} className="h-8 bg-cyan-500 text-xs text-white hover:bg-cyan-600">
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close resume preview"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto bg-slate-950 p-4 sm:p-8">
          <pre
            id="printable-resume"
            className="mx-auto min-h-[60vh] w-full max-w-[750px] whitespace-pre-wrap break-words rounded-sm bg-white p-6 font-sans text-xs leading-relaxed text-slate-900 shadow-2xl sm:p-8"
          >
            {resumeText}
          </pre>
        </div>
      </div>
    </div>
  );
}
