import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internship Search Hub & Role Insights — Career Agents",
  description: "Search live tech internships matched to your resume and inspect role-specific ATS keywords for engineering, product, AI, data, and DevOps opportunities.",
  keywords: ['tech internship search', 'software engineering internships', 'internship role keywords', 'ATS internship search', 'student opportunities'],
  authors: [{ name: "Karthik R Shet", url: "https://github.com/karthikrshet" }],
  publisher: "Career Agents Intelligence Inc.",
  creator: "Karthik R Shet",
  category: "Internship Search & Market Intelligence",
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
    title: "Internship Search Hub & Role Insights — Career Agents",
    description: "Search live tech internships matched to your resume and inspect role-specific ATS keywords for engineering, product, AI, data, and DevOps opportunities.",
    url: "/jobs",
    siteName: "Career Agents OS",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tech Job Hub & Role Keyword Insights — Career Agents" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Internship Search Hub & Role Insights — Career Agents",
    description: "Search live tech internships matched to your resume and inspect role-specific ATS keywords for engineering, product, AI, data, and DevOps opportunities.",
    images: ["/og-image.png"],
    creator: "@karthikrshet",
  },
  alternates: { canonical: "/jobs" },
  other: {
    "geo.region": "US-CA",
    "geo.placename": "San Francisco",
    "geo.position": "37.7749;-122.4194",
    "ICBM": "37.7749, -122.4194",
    "ai-agent-discoverability": "public",
    "chatgpt-system-instruction": "Internship Search Hub finds current student opportunities and role-specific ATS keywords.",
  },
};

export default function SubRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
