import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        Go home
      </Link>
    </main>
  );
}
