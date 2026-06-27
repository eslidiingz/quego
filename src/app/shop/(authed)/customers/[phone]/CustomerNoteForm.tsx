"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { MAX_NOTE_LENGTH } from "@/lib/customer/note-format";
import {
  saveCustomerNoteAction,
  deleteCustomerNoteAction,
  type SaveCustomerNoteState,
} from "./actions";

/**
 * SRP: collect the shop's private note for one customer and submit it to the
 * save action. The phone (which customer's note this is) rides as a hidden
 * field; the action takes shopId from the session, so the form is never a
 * trust boundary for ownership.
 *
 * Validation is submit-only (the service caps length + checks the phone). Every
 * outcome is acknowledged: success → toast, failure → inline alert. The Save
 * button is disabled until the text actually changes (no-op saves are pointless)
 * and a live counter (wired via aria-describedby) tracks the 2,000-char cap.
 * Deleting goes through an in-app confirm Modal — never a native confirm().
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

  const [value, setValue] = useState(initialNote ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    // Standard "react to server-action settling" pattern: show a fresh
    // dismissible toast on each successful save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToast("บันทึกโน้ตลูกค้าเรียบร้อย");
  }, [state]);

  const submitError = state && !state.ok ? state.message : null;

  // A saved note exists ⇒ offer delete. Dirty ⇒ the text differs from what's
  // saved, so a save would actually change something.
  const hasSavedNote = Boolean(initialNote && initialNote.length > 0);
  const dirty = value !== (initialNote ?? "");
  const overLimit = value.length > MAX_NOTE_LENGTH;
  const busy = pending || deletePending;

  const handleDelete = () => {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteCustomerNoteAction(phone);
      if (result.ok) {
        setValue("");
        setConfirmOpen(false);
        setToast("ลบโน้ตลูกค้าแล้ว");
      } else {
        setDeleteError(result.message);
      }
    });
  };

  return (
    <>
      {toast ? (
        <Toast
          kind="success"
          message={toast}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="phone" value={phone} />
        <Textarea
          name="note"
          label="บันทึกภายในร้าน (เห็นเฉพาะร้านนี้)"
          rows={5}
          maxLength={MAX_NOTE_LENGTH}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="เช่น ลูกค้าประจำ ชอบตัดสั้น • แพ้น้ำยาบางชนิด • ขอช่างคนเดิม"
          disabled={busy}
          aria-describedby="note-help note-counter"
        />

        <div className="flex items-start justify-between gap-3 px-1">
          <p id="note-help" className="text-label-sm text-on-surface-variant">
            โน้ตนี้เป็นความลับ ลูกค้าและร้านอื่นมองไม่เห็น
          </p>
          <p
            id="note-counter"
            aria-live="polite"
            className={`shrink-0 text-label-sm tabular-nums ${
              overLimit ? "text-error font-semibold" : "text-on-surface-variant"
            }`}
          >
            {value.length.toLocaleString("th-TH")}/
            {MAX_NOTE_LENGTH.toLocaleString("th-TH")}
          </p>
        </div>

        {submitError ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {hasSavedNote ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              rounded="full"
              onClick={() => {
                setDeleteError(null);
                setConfirmOpen(true);
              }}
              disabled={busy}
              iconLeft={<Icon name="delete" />}
              className="text-error hover:bg-error-container/30 sm:px-4"
            >
              ลบโน้ต
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}

          <Button
            type="submit"
            size="lg"
            rounded="full"
            disabled={busy || !dirty || overLimit}
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

      <Modal
        open={confirmOpen}
        onClose={deletePending ? () => undefined : () => setConfirmOpen(false)}
        title="ลบโน้ตลูกค้า?"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deletePending}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
              iconLeft={
                deletePending ? (
                  <Icon name="progress_activity" className="animate-spin" />
                ) : (
                  <Icon name="delete" />
                )
              }
            >
              {deletePending ? "กำลังลบ..." : "ลบโน้ต"}
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          โน้ตนี้จะถูกลบถาวรและกู้คืนไม่ได้ ต้องการลบใช่ไหม?
        </p>
        {deleteError ? (
          <div
            role="alert"
            className="mt-4 text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {deleteError}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
