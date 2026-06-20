import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  listExpensesByShop,
  listUsedExpenseCategories,
} from "@/lib/services/expenses";
import { ExpenseManager } from "./ExpenseManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ค่าใช้จ่าย · Quego",
};

export default async function ShopExpensesPage() {
  const session = await requireShopSession();
  const [expenses, usedCategories] = await Promise.all([
    listExpensesByShop(session.shopId),
    listUsedExpenseCategories(session.shopId),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <ExpenseManager expenses={expenses} usedCategories={usedCategories} />
    </div>
  );
}
