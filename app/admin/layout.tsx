import type { Metadata } from "next";
import { NOINDEX } from "@/app/_components/noindex";

export const metadata: Metadata = { robots: NOINDEX };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
