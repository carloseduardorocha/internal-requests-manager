import Image from "next/image";

// Official Sicredi logo, unaltered: colored on light backgrounds, negative on dark ones.
export function BrandLogo() {
  return (
    <>
      <Image
        src="/brand/sicredi-logo.png"
        alt="Sicredi"
        width={710}
        height={210}
        priority
        className="-mx-1.5 -my-1 block h-10 w-auto dark:hidden"
      />
      <Image
        src="/brand/sicredi-logo-negative.png"
        alt="Sicredi"
        width={709}
        height={209}
        priority
        className="-mx-1.5 -my-1 hidden h-10 w-auto dark:block"
      />
    </>
  );
}
