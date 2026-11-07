import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn";

export function ToolErrorBox({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("border-accent flex gap-3 rounded-md border p-4 text-sm", className)}>
      <AlertTriangle aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        {children ? <div className="text-muted-foreground mt-1">{children}</div> : null}
      </div>
    </div>
  );
}

export function ToolProgress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="label-mono flex justify-between">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="bg-muted h-1.5 overflow-hidden rounded-sm"
      >
        <div className="bg-accent h-full transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ResultPanel({
  title,
  children,
  actions,
  className,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border", className)}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <h3 className="label-mono">{title}</h3>
        {actions}
      </header>
      <div className="p-4 font-mono text-sm break-all">{children}</div>
    </section>
  );
}
