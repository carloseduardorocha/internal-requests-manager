import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="-my-2 -ml-1 inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-lg px-1 font-bold text-primary outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
