"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { MAX_NOTE_LENGTH } from "@/lib/customer/note-format";
import { saveCustomerNoteAction, type SaveCustomerNoteState } from "./actions";

/**
 * SRP: collect the shop's private note for one customer and submit it to the
 * save action. The phone (which customer's note this is) rides as a hidden
 * field; the action takes shopId from the session, so the form is never a
 * trust boundary for ownership.
 *
 * Validation is submit-only (the service caps length + checks the phone). Every
 * outcome is acknowledged: success → toast, failure → inline alert.
 */
export function CustomerNoteForm({
  phone,
  initialNote,
}: {
  phone: string;
  initialNote: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    SaveCustomerNoteState,
    FormData
  >(saveCustomerNoteAction, null);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    // Standard "react to server-action settling" pattern: show a fresh
    // dismissible toast on each success.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  const submitError = state && !state.ok ? state.message : null;

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="บันทึกโน้ตลูกค้าเรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="phone" value={phone} />
        <Textarea
          name="note"
          label="บันทึกภายในร้าน (เห็นเฉพาะร้านนี้)"
          rows={5}
          maxLength={MAX_NOTE_LENGTH}
          defaultValue={initialNote ?? ""}
          placeholder="เช่น ลูกค้าประจำ ชอบตัดสั้น • แพ้น้ำยาบางชนิด • ขอช่างคนเดิม"
          helperText="ไม่เกิน 2,000 ตัวอักษร • โน้ตนี้เป็นความลับ ลูกค้าและร้านอื่นมองไม่เห็น"
          disabled={pending}
        />

        {submitError ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button
            type="submit"
            size="lg"
            rounded="full"
            disabled={pending}
            iconLeft={
              pending ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="save" />
              )
            }
          >
            {pending ? "กำลังบันทึก..." : "บันทึกโน้ต"}
          </Button>
        </div>
      </form>
    </>
  );
}
