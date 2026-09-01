"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { getOutboundUrl } from "@/lib/affiliate";

export default function EventShareButton({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "copied">("idle");
  const shareUrl = getOutboundUrl(eventId);

  async function handleShare(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const sharePayload = {
      title: `${title} | ${t("brand")}`,
      text: t("shareText", { title }),
      url: shareUrl,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(sharePayload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      window.prompt(t("copyLink"), shareUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="text-xs font-medium text-zinc-400 transition hover:text-accent"
      aria-label={t("shareAria", { title })}
    >
      {status === "copied" ? t("linkCopied") : t("share")}
    </button>
  );
}
