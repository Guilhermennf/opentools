"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../lib/cn";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn("bg-background z-50 min-w-40 rounded-md border p-1 text-sm", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      className={cn(
        "data-[highlighted]:bg-muted relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-7 outline-none select-none",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 inline-flex size-3.5 items-center justify-center">
        <Primitive.ItemIndicator>
          <span className="bg-accent size-1.5 rounded-full" />
        </Primitive.ItemIndicator>
      </span>
      {children}
    </Primitive.RadioItem>
  );
}
