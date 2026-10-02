import Link from "next/link";
import { getLocale, getMessages } from "@/lib/i18n/get-locale";

export default function EventNotFound() {
  const copy = getMessages(getLocale());

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-gradient px-4 text-center">
      <h1 className="font-display text-3xl text-white">{copy.eventNotFoundTitle}</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">{copy.eventNotFoundBody}</p>
      <Link
        href="/"
        className="mt-6 text-sm font-semibold text-accent transition hover:text-accent-hover"
      >
        {copy.backToGigs}
      </Link>
    </main>
  );
}
