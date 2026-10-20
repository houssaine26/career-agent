import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Studio — Resume Review & Role Keyword Analysis",
  description:
    "Review your resume text, identify role-specific keyword and section gaps, and get suggestions you can adapt to reflect your real experience. Upload a resume or paste its text.",
  keywords: [
    "resume review", "resume keyword analysis", "resume section review",
    "resume role matching", "career resume tool",
  ],
  authors: [{ name: "Karthik R Shet", url: "https://github.com/karthikrshet" }],
  category: "Career Tools & Resume Engineering",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Resume Studio — Resume Review & Role Keyword Analysis",
    description: "Review resume sections and role-specific keywords, then use relevant suggestions to improve your resume.",
    url: "/resume",
    siteName: "Career Agents OS",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Career Agents Resume Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Studio — Resume Review",
    description: "Review resume sections and role-specific keywords with suggestions based on the content you provide.",
    images: ["/og-image.png"],
    creator: "@karthikrshet",
  },
  alternates: { canonical: "/resume" },
  other: {
    "ai-agent-discoverability": "public",
    "chatgpt-system-instruction": "Resume Studio reviews resume text for section coverage and role-specific keyword gaps, and provides suggestions for the user to evaluate.",
  },
};

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
