"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export function ServerFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("offset");
      startTransition(() => router.push(`/?${params.toString()}`));
    },
    [router, searchParams]
  );

  const inputCls = "rounded-lg border border-gray-700 bg-gray-850 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search servers…"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => update("search", e.target.value)}
        className={`${inputCls} w-full sm:w-64`}
      />
      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className={inputCls}
      >
        <option value="">All statuses</option>
        <option value="up">Up</option>
        <option value="down">Down</option>
        <option value="degraded">Degraded</option>
        <option value="unknown">Unknown</option>
      </select>
      <select
        defaultValue={searchParams.get("transport_type") ?? ""}
        onChange={(e) => update("transport_type", e.target.value)}
        className={inputCls}
      >
        <option value="">All transports</option>
        <option value="streamable-http">Streamable HTTP</option>
        <option value="sse">SSE</option>
        <option value="stdio">Stdio</option>
      </select>
      <select
        defaultValue={searchParams.get("sort") ?? ""}
        onChange={(e) => update("sort", e.target.value)}
        className={inputCls}
      >
        <option value="">Sort: Default</option>
        <option value="trust_score">Trust Score</option>
        <option value="name">Name</option>
        <option value="uptime_24h">Uptime</option>
        <option value="latency_p50">Latency</option>
      </select>
      {isPending && <span className="text-xs text-gray-500">Loading…</span>}
    </div>
  );
}
