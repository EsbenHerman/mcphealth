"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export function Pagination({ total, limit, offset }: { total: number; limit: number; offset: number }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  if (total <= limit) return null;

  const pages = Math.ceil(total / limit);
  const current = Math.floor(offset / limit);

  function href(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", String(page * limit));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      {current > 0 && (
        <Link href={href(current - 1)} scroll={false} className="rounded-lg border border-gray-700 bg-gray-850 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
          ← Prev
        </Link>
      )}
      <span className="text-sm text-gray-500">
        Page {current + 1} of {pages}
      </span>
      {current < pages - 1 && (
        <Link href={href(current + 1)} scroll={false} className="rounded-lg border border-gray-700 bg-gray-850 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
          Next →
        </Link>
      )}
    </div>
  );
}
