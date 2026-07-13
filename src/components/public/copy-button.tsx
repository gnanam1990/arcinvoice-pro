"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "icon";
  onCopied?: () => void;
};

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for restricted clipboard
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("print:hidden", className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
