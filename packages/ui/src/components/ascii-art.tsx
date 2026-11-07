import * as React from "react";
import { cn } from "../lib/cn";

export interface AsciiArtProps extends Omit<React.ComponentProps<"figure">, "children"> {
  art: string;
  /** Accessible description of the illustration (already localized). */
  label: string;
  animated?: boolean;
}

/** Renders an ASCII illustration that scales to its container without wrapping or distortion. */
export function AsciiArt({ art, label, animated = false, className, style, ...props }: AsciiArtProps) {
  const lines = art.replace(/\s+$/, "").split("\n");
  const cols = Math.max(...lines.map((l) => l.length), 1);
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn("ascii-figure", className)}
      style={{ ...style, ["--ascii-cols" as string]: cols }}
      {...props}
    >
      <pre aria-hidden="true" className={cn("ascii-pre", animated && "ascii-animated")}>
        {lines.join("\n")}
      </pre>
    </figure>
  );
}
