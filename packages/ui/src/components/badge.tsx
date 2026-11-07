import * as React from "react";
import { cn } from "../lib/cn";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("label-mono inline-flex items-center rounded-sm border px-1.5 py-0.5", className)}
      {...props}
    />
  );
}
