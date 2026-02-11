"use client";

import Link from "next/link";

export default function ServerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-400 transition-colors">
        ← Back to dashboard
      </Link>
      <div className="flex flex-col items-center py-16 space-y-4">
        <div className="text-5xl">💥</div>
        <h1 className="text-2xl font-semibold text-gray-200">Failed to load server</h1>
        <p className="text-gray-500 text-sm">The API might be temporarily unavailable.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-green-500/15 px-5 py-2 text-sm font-medium text-green-400 ring-1 ring-green-500/30 hover:bg-green-500/25 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
