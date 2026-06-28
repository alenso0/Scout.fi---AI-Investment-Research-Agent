"use client";

import { useState } from "react";

const EXAMPLES = ["Tesla", "Zomato", "Nvidia"];

export function CompanyForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (companyName: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Company name, e.g. Tesla"
          disabled={disabled}
          className="flex-1 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          Research
        </button>
      </div>
      <div className="flex gap-2 font-mono text-xs text-muted">
        <span>Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit(example)}
            className="underline-offset-2 hover:underline disabled:opacity-40"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
