import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Profile not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page doesn&apos;t exist or isn&apos;t published.</p>
      <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">
        Go home
      </Link>
    </div>
  );
}
