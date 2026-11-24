import Link from "next/link";
import { BadgeCheck, Handshake, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";

const FEATURES = [
  {
    icon: QrCode,
    title: "One link, one QR code",
    body: "A fast public page with your socials, tip links and recommendations. Guests scan it without downloading anything.",
  },
  {
    icon: Handshake,
    title: "Partnerships you approve",
    body: "Local, tourism and national businesses invite you. Nothing appears on your page unless you accept it.",
  },
  {
    icon: ShieldCheck,
    title: "Consent-first relationships",
    body: "Guests choose what to share and can revoke it at any time. No phone numbers or emails are exposed.",
  },
  {
    icon: BadgeCheck,
    title: "Clear disclosures",
    body: "Sponsored and affiliate recommendations are always labeled, so trust stays intact.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium text-brand">For bartenders, servers and the businesses they trust</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {brand.tagline}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          {brand.name} helps hospitality professionals recommend businesses they actually believe in — and keeps every
          relationship permission-based. No big following required.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Create your free profile</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">I&apos;m a business</Link>
          </Button>
        </div>
      </section>
      <section aria-labelledby="features" className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="features" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon aria-hidden className="size-6 text-brand" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
