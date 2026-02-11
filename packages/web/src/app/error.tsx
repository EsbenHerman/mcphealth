"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="text-5xl">💥</div>
      <h1 className="text-2xl font-semibold text-gray-200">Something went wrong</h1>
      <p className="text-gray-500 text-sm max-w-md text-center">
        An unexpected error occurred. This might be a temporary issue with the API.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-green-500/15 px-5 py-2 text-sm font-medium text-green-400 ring-1 ring-green-500/30 hover:bg-green-500/25 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
