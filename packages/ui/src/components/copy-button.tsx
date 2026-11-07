"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}

export function CopyButton({ value, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className={className}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}
