"use client";
import { PantallaError } from "@/components/PantallaError";

export default function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaError error={error} reset={reset} origen="panel" />;
}
