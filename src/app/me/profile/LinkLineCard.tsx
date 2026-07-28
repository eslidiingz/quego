"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Toast, type ToastKind } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { unlinkLineAction } from "./actions";

/**
 * SRP: present the customer's LINE notification-connection state + the connect /
 * disconnect affordances. Presentational + action-driven — `linked` is injected
 * from the server page (DIP); the OAuth handshake + binding live in the route
 * handlers and the line-linking service.
 *
 * Connect is a full-page navigation to the OAuth start route (an anchor, NOT a
 * server action) so the browser follows the 302 to LINE. The connect outcome
 * comes back as a ?notice= flash (surfaced by FlashToast on the page); the
 * disconnect outcome toasts here directly. Mirrors ShopLineCard (the shop side).
 */
export function LinkLineCard({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null,
  );

  if (linked) {
    return (
      <>
        {toast ? (
          <Toast
            kind={toast.kind}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        ) : null}
        <FormSection icon="notifications_active" title="การแจ้งเตือนผ่าน LINE">
          <div className="flex items-start gap-3 rounded-xl bg-success-container/40 border border-success/30 px-4 py-3">
            <Icon name="check_circle" className="text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-body-md text-on-surface font-medium">
                เชื่อมต่อ LINE แล้ว
              </p>
              <p className="text-label-md text-on-surface-variant">
                เราจะส่งข้อความเมื่อจองสำเร็จ ร้านยกเลิกคิว และมีคิวว่างจากรายการรอ
              </p>
            </div>
          </div>

          <div className="w-full pt-2 sm:flex sm:justify-end">
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  iconLeft={<Icon name="link_off" />}
                  className="w-full sm:w-auto"
                >
                  ยกเลิกการเชื่อม LINE
                </Button>
              }
              title="ยกเลิกการเชื่อม LINE?"
              description="คุณจะไม่ได้รับแจ้งเตือนคิวผ่าน LINE จนกว่าจะเชื่อมต่อใหม่อีกครั้ง"
              confirmLabel="ยกเลิกการเชื่อม"
              destructive
              onConfirm={async () => {
                const res = await unlinkLineAction();
                if (!res.ok) throw new Error(res.message);
                setToast({
                  kind: "success",
                  message: "ยกเลิกการเชื่อม LINE แล้ว",
                });
                router.refresh();
              }}
            />
          </div>
        </FormSection>
      </>
    );
  }

  return (
    <FormSection icon="notifications" title="การแจ้งเตือนผ่าน LINE">
      <p className="text-body-md text-on-surface-variant">
        เชื่อมต่อบัญชี LINE ของคุณ เพื่อรับใบยืนยันเมื่อจองสำเร็จ แจ้งเมื่อร้านยกเลิกคิว
        และเมื่อมีคิวว่างจากรายการที่ฝากรอไว้ ระบบจะพาคุณไปยืนยันสิทธิ์ (authorize)
        กับ LINE ก่อน แล้วจึงเชื่อมต่อให้อัตโนมัติ
      </p>

      <ol className="list-decimal space-y-2 pl-5 text-label-md text-on-surface-variant">
        <li>กดปุ่ม “เชื่อมต่อ LINE” ด้านล่าง</li>
        <li>อนุญาตการเข้าถึง และเพิ่มบัญชีทางการของ Quego เป็นเพื่อนใน LINE</li>
        <li>ระบบจะพากลับมาที่หน้านี้พร้อมสถานะ “เชื่อมต่อ LINE แล้ว”</li>
      </ol>

      <div className="pt-1">
        {/* Full-page nav to the OAuth start route — must be an anchor so the
            browser follows the 302 to LINE. Reuses the Button class composition
            (buttonClassName) instead of hand-copying tokens, so it can't drift. */}
        <a
          href="/api/customer/line/connect"
          className={buttonClassName({ size: "lg" })}
        >
          <Icon name="link" size={18} />
          เชื่อมต่อ LINE
        </a>
      </div>
    </FormSection>
  );
}
