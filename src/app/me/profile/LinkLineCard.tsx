"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Toast, type ToastKind } from "@/components/ui/Toast";
import { CopyField } from "@/components/ui/CopyField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import {
  requestLineLinkAction,
  unlinkLineAction,
  type RequestLinkActionState,
} from "./actions";

/**
 * SRP: present the customer's LINE notification-link state plus the connect /
 * disconnect affordances. Purely presentational + action-driven — the linked
 * status is injected from the server page (DIP), and the binding logic lives in
 * the line-linking service. Reuses CopyField / ConfirmDialog / Toast so this
 * surface matches the rest of the app.
 */
export function LinkLineCard({ linked }: { linked: boolean }) {
  const router = useRouter();
  const [linkState, setLinkState] = useState<RequestLinkActionState | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
  } | null>(null);

  const handleRequestCode = () => {
    startTransition(async () => {
      const res = await requestLineLinkAction();
      setLinkState(res);
      if (!res.ok) setToast({ kind: "error", message: res.message });
    });
  };

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
                เชื่อมบัญชี LINE แล้ว
              </p>
              <p className="text-label-md text-on-surface-variant">
                คุณจะได้รับแจ้งเตือนสถานะคิวผ่าน LINE
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" iconLeft={<Icon name="link_off" />}>
                  ยกเลิกการเชื่อม LINE
                </Button>
              }
              title="ยกเลิกการเชื่อม LINE?"
              description="คุณจะไม่ได้รับแจ้งเตือนคิวผ่าน LINE จนกว่าจะเชื่อมบัญชีใหม่อีกครั้ง"
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
    <>
      {toast ? (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <FormSection icon="notifications" title="การแจ้งเตือนผ่าน LINE">
        <p className="text-body-md text-on-surface-variant">
          เชื่อมบัญชี LINE เพื่อรับแจ้งเตือนเมื่อจองสำเร็จ ใกล้ถึงคิว
          และเมื่อถึงคิวของคุณ
        </p>

        {linkState?.ok ? (
          <div className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-body-md text-on-surface">
              <li>
                กดปุ่ม “เปิด LINE แล้วส่งรหัส” ด้านล่าง
                หรือคัดลอกรหัสไปวางในแชต queva OA
              </li>
              <li>ส่งรหัสในแชต แล้วรอข้อความยืนยัน “เชื่อมบัญชีสำเร็จ”</li>
              <li>กลับมาที่หน้านี้แล้วกด “รีเฟรชสถานะ”</li>
            </ol>

            <CopyField
              value={linkState.code}
              label="รหัสเชื่อมบัญชี (ใช้ได้ภายใน 10 นาที)"
              id="line-link-code"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* LINE deep link → opens the OA chat pre-filled with the code.
                  Styled with design tokens (no nested button-in-anchor). */}
              <a
                href={linkState.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-label-md font-medium text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-[0.98]"
              >
                <Icon name="open_in_new" size={18} />
                เปิด LINE แล้วส่งรหัส
              </a>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.refresh()}
                iconLeft={<Icon name="refresh" />}
              >
                รีเฟรชสถานะ
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="xl"
            onClick={handleRequestCode}
            disabled={pending}
            iconLeft={
              pending ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="link" />
              )
            }
          >
            {pending ? "กำลังสร้างรหัส..." : "เชื่อม LINE"}
          </Button>
        )}
      </FormSection>
    </>
  );
}
