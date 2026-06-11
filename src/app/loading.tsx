import { FullPageSpinner } from "@/components/ui/Skeleton";

/**
 * Universal instant fallback — the root Suspense boundary. Covers any segment
 * without its own `loading.tsx` (home discovery, login/PIN flows, shop
 * registration, kiosk display) so every navigation shows a loading state
 * before the page's DOM streams in.
 */
export default function Loading() {
  return <FullPageSpinner />;
}
