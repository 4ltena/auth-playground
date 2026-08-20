/*
 * Metadata for private routes.
 *
 * robots.txt alone doesn't prevent indexing — a crawler that can't read the
 * page also can't read a noindex tag, and an externally-linked page can
 * still get indexed. So private pages emit noindex themselves.
 *
 * Used by app/(account)/account/layout.tsx and app/admin/layout.tsx.
 * Declare it once per route segment and let child pages inherit it — a
 * per-page declaration means the next page someone adds is one forgotten
 * line away from getting indexed.
 */
import type { Metadata } from "next";

export const NOINDEX: Metadata["robots"] = { index: false, follow: false, nocache: true };
