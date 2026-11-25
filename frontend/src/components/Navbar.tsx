"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import { mainNav } from "@/lib/nav";
import { siteConfig } from "@/lib/config";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-[1000] border-b border-line-soft bg-[rgba(10,12,16,0.85)] py-4 backdrop-blur-md">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex flex-1 justify-start">
          <Link href="/" aria-label={`${siteConfig.name} — inicio`}>
            <Image
              src="/logo-jp.webp"
              alt={`${siteConfig.name} logo`}
              width={480}
              height={465}
              className="h-12 w-auto md:h-[60px]"
              priority
            />
          </Link>
        </div>

        <div className="hidden flex-[2] items-center justify-center gap-10 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname?.startsWith(item.href) ? "page" : undefined}
              className={cn(
                "text-[0.8rem] font-bold uppercase tracking-[1px] transition-colors hover:text-accent",
                pathname?.startsWith(item.href) ? "text-accent" : "text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden flex-1 justify-end md:flex">
          <ButtonLink href="/financiamiento" size="sm" className="px-7 font-black">
            Cotizar Crédito
          </ButtonLink>
        </div>
      </div>
    </nav>
  );
}
