"use client";

import { useState } from "react";

export function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (!domain || failed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background font-mono text-sm text-muted">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      width={40}
      height={40}
      className="h-10 w-10 rounded-sm border border-border object-contain bg-white"
      onError={() => setFailed(true)}
    />
  );
}
