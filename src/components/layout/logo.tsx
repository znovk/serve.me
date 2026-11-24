import Link from "next/link";
import { brand } from "@/lib/config/brand";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        {brand.name.slice(0, 1)}
      </span>
      <span>{brand.name}</span>
    </Link>
  );
}
