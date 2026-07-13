"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/public/copy-button";

type ShareActionsProps = {
  title: string;
  text: string;
  url: string;
  printHref?: string;
  onLinkCopied?: () => void;
};

function subscribeToShareCapability() {
  return () => {};
}

function getShareCapability() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ShareActions({
  title,
  text,
  url,
  printHref,
  onLinkCopied,
}: ShareActionsProps) {
  const [shareNote, setShareNote] = useState<string | null>(null);
  const canShare = useSyncExternalStore(
    subscribeToShareCapability,
    getShareCapability,
    () => false,
  );

  async function handleShare() {
    setShareNote(null);
    if (canShare) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
      onLinkCopied?.();
    } catch {
      setShareNote("Could not share — copy the link below");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <CopyButton
        value={url}
        label="Copy secure link"
        onCopied={onLinkCopied}
      />
      <Button type="button" variant="secondary" size="sm" onClick={handleShare}>
        {canShare ? "Share" : "Copy link to share"}
      </Button>
      {printHref ? (
        <Button href={printHref} variant="outline" size="sm">
          Print / PDF
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          Print
        </Button>
      )}
      {shareNote ? (
        <span className="text-xs text-muted" role="status">
          {shareNote}
        </span>
      ) : null}
    </div>
  );
}
