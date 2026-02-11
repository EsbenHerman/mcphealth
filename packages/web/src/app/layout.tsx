import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPHealth — MCP Server Health Monitor",
  description:
    "Real-time health monitoring and trust scores for MCP servers. Check availability, latency, and reliability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <span className="text-xl font-bold text-green-400">⚡</span>
            <h1 className="text-xl font-bold tracking-tight">MCPHealth</h1>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
