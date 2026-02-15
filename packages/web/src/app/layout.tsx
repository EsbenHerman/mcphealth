import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mcphealth.dev";

export const metadata: Metadata = {
  title: {
    default: "MCPHealth — MCP Server Health Monitor & Trust Scores",
    template: "%s | MCPHealth",
  },
  description:
    "Real-time health monitoring, uptime tracking, and trust scores for MCP servers. Check availability, latency, and protocol compliance.",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "MCP server",
    "health monitoring",
    "trust score",
    "uptime",
    "server status",
  ],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "MCPHealth — MCP Server Health Monitor & Trust Scores",
    description:
      "Real-time health monitoring, uptime tracking, and trust scores for MCP servers.",
    url: SITE_URL,
    siteName: "MCPHealth",
    type: "website",
    images: [{ url: "/og", width: 1200, height: 630, alt: "MCPHealth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MCPHealth — MCP Server Health Monitor",
    description:
      "Real-time health monitoring and trust scores for MCP servers.",
    images: ["/og"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/15 text-green-400 text-sm font-bold ring-1 ring-green-500/30">⚡</span>
              <span className="text-lg font-bold tracking-tight group-hover:text-green-400 transition-colors">MCPHealth</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100 transition-colors">Dashboard</Link>
              <Link href="/docs" className="hover:text-gray-100 transition-colors">Docs</Link>
              <a href="https://github.com/EsbenHerman/mcphealth" target="_blank" rel="noopener" className="hover:text-gray-100 transition-colors">GitHub</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-gray-800/50 mt-16">
          <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-gray-600">
            MCPHealth — Open-source MCP server monitoring
          </div>
        </footer>
      </body>
    </html>
  );
}
