import type { Metadata } from "next";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import { getLocale, getMessages } from "@/lib/i18n/get-locale";
import { interpolate } from "@/lib/i18n/messages";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const CONTACT_EMAIL = "hello@barcelonagigguide.com";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getMessages(getLocale());
  const description = interpolate(copy.privacyMetaDescription, { site: SITE_NAME });

  return {
    title: copy.privacyTitle,
    description,
    alternates: { canonical: "/privacy" },
    openGraph: {
      title: `${copy.privacyTitle} | ${SITE_NAME}`,
      description,
      url: absoluteUrl("/privacy"),
    },
  };
}

function StrongLead({ text }: { text: string }) {
  const period = text.indexOf(". ");
  const dash = text.indexOf(" — ");
  if (period !== -1 && (dash === -1 || period < dash)) {
    return (
      <>
        <strong className="text-white">{text.slice(0, period + 1)}</strong>
        {text.slice(period + 1)}
      </>
    );
  }
  if (dash !== -1) {
    return (
      <>
        <strong className="text-white">{text.slice(0, dash)}</strong>
        {text.slice(dash)}
      </>
    );
  }
  return <>{text}</>;
}

function ContactLine({ template, email }: { template: string; email: string }) {
  const [before, after] = template.split("{email}");
  return (
    <p>
      {before}
      <a href={`mailto:${email}`} className="text-accent hover:text-accent-hover">
        {email}
      </a>
      {after}
    </p>
  );
}

export default function PrivacyPage() {
  const copy = getMessages(getLocale());

  return (
    <main className="flex min-h-screen flex-col bg-brand-gradient">
      <header className="border-b border-white/8 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-accent transition hover:text-accent-hover"
            >
              {copy.backToGigs}
            </Link>
            <h1 className="mt-4 font-display text-4xl text-white">{copy.privacyTitle}</h1>
            <p className="mt-2 text-sm text-zinc-400">{copy.privacyLastUpdated}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyOverview}</h2>
            <p>
              {interpolate(copy.privacyOverviewP1, {
                site: SITE_NAME,
                url: SITE_URL,
              })}
            </p>
            <p>{copy.privacyOverviewP2}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyCollect}</h2>
            <p>
              <StrongLead text={copy.privacyCollectListings} />
            </p>
            <p>
              <StrongLead text={copy.privacyCollectAnalytics} />{" "}
              <a
                href="https://policies.google.com/privacy"
                className="text-accent hover:text-accent-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.privacyGooglePolicy}
              </a>
              .
            </p>
            <p>
              <StrongLead text={copy.privacyCollectLogs} />
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyUse}</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>{copy.privacyUse1}</li>
              <li>{copy.privacyUse2}</li>
              <li>{copy.privacyUse3}</li>
              <li>{copy.privacyUse4}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyThird}</h2>
            <p>{copy.privacyThirdIntro}</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <StrongLead text={copy.privacyThirdSources} />
              </li>
              <li>
                <StrongLead text={copy.privacyThirdHost} />
              </li>
              <li>
                <StrongLead text={copy.privacyThirdAnalytics} />
              </li>
              <li>
                <StrongLead text={copy.privacyThirdMaps} />
              </li>
            </ul>
            <p>{copy.privacyThirdLeave}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyRetention}</h2>
            <p>{copy.privacyRetentionP}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyRights}</h2>
            <p>
              {copy.privacyRightsP}{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                className="text-accent hover:text-accent-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.privacyOptOut}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyChildren}</h2>
            <p>{copy.privacyChildrenP}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyChanges}</h2>
            <p>{copy.privacyChangesP}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-white">{copy.privacyContact}</h2>
            <ContactLine template={copy.privacyContactP} email={CONTACT_EMAIL} />
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
