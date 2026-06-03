import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ notice?: string }>;

/**
 * The standalone shop login page has been consolidated into the unified
 * `/login` (shop tab). This route is kept only as a redirect so old links,
 * bookmarks, and any stray references land in the right place. Step 2 (PIN)
 * still lives at `/shop/login/pin`.
 */
export default async function ShopLoginRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { notice } = await searchParams;
  const params = new URLSearchParams({ tab: "shop" });
  if (notice) params.set("notice", notice);
  redirect(`/login?${params.toString()}`);
}
