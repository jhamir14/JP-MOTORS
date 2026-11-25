import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  as?: "h1" | "h2";
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <span className="eyebrow mb-3">{eyebrow}</span>}
      <Tag className={Tag === "h1" ? "mt-3 text-[2.2rem] md:text-[3rem]" : "text-[1.9rem] md:text-[2.4rem]"}>{title}</Tag>
      {children && <p className="mt-3 text-[1.05rem] text-muted">{children}</p>}
    </div>
  );
}
