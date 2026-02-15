"use client";

import { useState } from "react";

/* ── Hero ─────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative pt-12 pb-16 text-center">
      {/* glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[32rem] bg-green-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative space-y-6 max-w-3xl mx-auto">
        <p className="inline-block rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-xs font-medium text-green-400 tracking-wide uppercase">
          Open-source MCP monitoring
        </p>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
          Know which MCP servers
          <br />
          <span className="text-green-400">you can trust</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
          Real-time health monitoring, uptime tracking, and trust scores for every MCP server in the official registry.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <a href="#dashboard" className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-semibold text-gray-950 hover:bg-green-400 transition-colors">
            Browse servers ↓
          </a>
          <a href="#badge" className="rounded-lg border border-gray-700 px-6 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            Get a trust badge
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Live Stats Strip ─────────────────────────────────────────────── */
function StatsStrip({ totalServers, avgScore }: { totalServers: number; avgScore: number | null }) {
  const items = [
    { value: `${totalServers.toLocaleString()}+`, label: "servers tracked" },
    { value: "Every 30 min", label: "health checks" },
    { value: "0–100", label: "trust scores" },
    { value: avgScore !== null ? Math.round(avgScore).toString() : "—", label: "avg score" },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-gray-800 bg-gray-800 overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-900/80 px-6 py-5 text-center">
          <p className="text-2xl font-bold text-gray-100">{item.value}</p>
          <p className="mt-1 text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

/* ── How It Works ─────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", icon: "📡", title: "We sync from the registry", desc: "Every MCP server published to the official registry is automatically discovered and added." },
    { num: "02", icon: "🔍", title: "We check health", desc: "Automated checks run every 30 minutes — testing connectivity, latency, and protocol compliance." },
    { num: "03", icon: "🏆", title: "We score trust", desc: "A 0–100 trust score combines availability, latency, stability, compliance, and metadata quality." },
  ];

  return (
    <section className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <p className="mt-2 text-gray-400 text-sm">Three steps to transparent MCP server trust</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.num} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-mono text-green-400/60">{s.num}</span>
            </div>
            <h3 className="font-semibold text-gray-100">{s.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Badge CTA ────────────────────────────────────────────────────── */
function BadgeCTA() {
  const exampleName = "composio";
  const badgeUrl = `https://api.mcphealth.dev/api/badge/${exampleName}`;
  const markdownSnippet = `[![MCPHealth](https://api.mcphealth.dev/api/badge/YOUR-SERVER)](https://mcphealth.dev/server/YOUR-SERVER)`;
  const [copied, setCopied] = useState(false);

  return (
    <section id="badge" className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Add a trust badge to your repo</h2>
        <p className="text-gray-400 text-sm">Show users your MCP server&apos;s health status and trust score.</p>
      </div>

      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeUrl} alt="MCPHealth trust badge example" className="h-6" />
      </div>

      <div className="max-w-xl mx-auto">
        <div className="relative rounded-lg bg-gray-950 border border-gray-800 p-4 font-mono text-xs text-gray-300 overflow-x-auto">
          <code>{markdownSnippet}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(markdownSnippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="absolute top-2 right-2 rounded-md bg-gray-800 px-2 py-1 text-[10px] text-gray-400 hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Developer CTAs ───────────────────────────────────────────────── */
function DeveloperCTAs() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔌</span>
          <h3 className="font-semibold text-gray-100">REST API</h3>
        </div>
        <p className="text-sm text-gray-400">Query server health, scores, and check history programmatically.</p>
        <code className="block mt-2 text-xs text-green-400/80 font-mono">GET api.mcphealth.dev/api/servers</code>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📰</span>
          <h3 className="font-semibold text-gray-100">RSS Feed</h3>
        </div>
        <p className="text-sm text-gray-400">Subscribe to status changes and new server discoveries in your feed reader.</p>
        <code className="block mt-2 text-xs text-green-400/80 font-mono">api.mcphealth.dev/api/rss</code>
      </div>
    </section>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────────── */
function FAQ() {
  const faqs = [
    {
      q: "What is MCP?",
      a: "The Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. MCP servers provide capabilities like file access, database queries, and API integrations that AI models can use.",
    },
    {
      q: "What's a trust score?",
      a: "A trust score is a 0–100 rating that reflects how reliable and well-maintained an MCP server is. Higher scores mean the server is more dependable for production use.",
    },
    {
      q: "How is the trust score calculated?",
      a: "The score combines six factors: availability (uptime), latency (response time), schema stability (consistent tool definitions), protocol compliance (correct MCP implementation), metadata quality (descriptions, docs), and freshness (recent activity). Each factor is weighted and combined into a single score.",
    },
  ];

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-center">Frequently asked questions</h2>
      <div className="space-y-4 max-w-2xl mx-auto">
        {faqs.map((faq) => (
          <details key={faq.q} className="group rounded-xl border border-gray-800 bg-gray-900/50">
            <summary className="cursor-pointer px-6 py-4 font-medium text-gray-100 flex items-center justify-between">
              {faq.q}
              <span className="text-gray-500 group-open:rotate-45 transition-transform text-lg">+</span>
            </summary>
            <div className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── Composed Landing ─────────────────────────────────────────────── */
export function Landing({ totalServers, avgScore }: { totalServers: number; avgScore: number | null }) {
  return (
    <div className="space-y-16 pb-16 border-b border-gray-800/50 mb-12">
      <Hero />
      <StatsStrip totalServers={totalServers} avgScore={avgScore} />
      <HowItWorks />
      <BadgeCTA />
      <DeveloperCTAs />
      <FAQ />
    </div>
  );
}
