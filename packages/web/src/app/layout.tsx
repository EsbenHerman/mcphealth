import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPHealth — MCP Server Health Monitor",
  description: "Real-time health monitoring and trust scores for MCP servers.",
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
