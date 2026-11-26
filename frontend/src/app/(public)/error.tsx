"use client";
import { PantallaError } from "@/components/PantallaError";

export default function ErrorWeb({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaError error={error} reset={reset} origen="web" />;
}
