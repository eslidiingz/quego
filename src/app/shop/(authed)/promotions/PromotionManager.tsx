"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  parsePromotionFormData,
  validatePromotionForm,
  hasPromotionErrors,
  type PromotionFormErrors,
} from "@/lib/validation/shop";
import {
  MIN_REQUIRED_STAMPS,
  MAX_REQUIRED_STAMPS,
} from "@/lib/promotions/stamp-card";
import type {
  ShopPromotionListItem,
  PromotionParticipant,
} from "@/lib/services/promotions";
import {
  savePromotionAction,
  deletePromotionAction,
  setPromotionActiveAction,
  loadPromotionParticipantsAction,
  redeemPromotionRewardAction,
  type PromotionFormState,
} from "./actions";

/**
 * Promotion (โปรโมชั่น) manager (shop owner). Renders the stamp-card list and
 * owns the add/edit dialog, the active toggle, delete confirm, and the
 * "ผู้สะสมแต้ม" (collectors) dialog with per-customer redeem.
 *
 * Data comes in as props (the server page reads it); this component handles UI
 * state and calls the server actions. SRP: list layout + dialog orchestration;
 * the form lives in `PromotionFormModal`, a card in `PromotionCard`, and the
 * collectors view in `ParticipantsModal`.
 */
export function PromotionManager({
  promotions,
}: {
  promotions: ShopPromotionListItem[];
}) {
  const [editing, setEditing] = useState<ShopPromotionListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [participantsFor, setParticipantsFor] =
    useState<ShopPromotionListItem | null>(null);
  const [toast, setToast] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(promotion: ShopPromotionListItem) {
    setEditing(promotion);
    setDialogOpen(true);
  }
  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-stack-md">
      <PageHeader
        eyebrow="การตลาด"
        title="โปรโมชั่น"
        description="สร้างบัตรสะสมแต้ม — ลูกค้าใช้บริการครบตามจำนวนที่กำหนด รับสิทธิ์ที่คุณตั้งไว้ แต้มจะเพิ่มอัตโนมัติทุกครั้งที่งานเสร็จสิ้น"
        action={
          <Button
            size="sm"
            iconLeft={<Icon name="add" size={18} />}
            onClick={openAdd}
          >
            เพิ่มโปรโมชั่น
          </Button>
        }
      />

      {toast ? (
        <div
          role="status"
          className={
            "rounded-lg border px-4 py-3 text-label-md flex items-center gap-2 " +
            (toast.kind === "success"
              ? "bg-primary-container/20 border-primary/30 text-primary"
              : "bg-error-container/40 border-error/30 text-error")
          }
        >
          <Icon name={toast.kind === "success" ? "check_circle" : "error"} />
          {toast.message}
        </div>
      ) : null}

      <section className="space-y-stack-md">
        {promotions.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                onEdit={() => openEdit(promotion)}
                onViewCollectors={() => setParticipantsFor(promotion)}
                onToggleError={(message) => showToast("error", message)}
              />
            ))}
          </ul>
        )}
      </section>

      {dialogOpen ? (
        <PromotionFormModal
          editing={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() =>
            showToast(
              "success",
              editing ? "แก้ไขโปรโมชั่นแล้ว" : "เพิ่มโปรโมชั่นแล้ว",
            )
          }
        />
      ) : null}

      {participantsFor ? (
        <ParticipantsModal
          promotion={participantsFor}
          onClose={() => setParticipantsFor(null)}
          onToast={showToast}
        />
      ) : null}
    </div>
  );
}

function PromotionCard({
  promotion,
  onEdit,
  onViewCollectors,
  onToggleError,
}: {
  promotion: ShopPromotionListItem;
  onEdit: () => void;
  onViewCollectors: () => void;
  onToggleError: (message: string) => void;
}) {
  // Local optimistic active state so the toggle flips immediately; revert on error.
  const [active, setActive] = useState(promotion.isActive);
  const [pending, startTransition] = useTransition();

  function toggleActive(next: boolean) {
    setActive(next);
    startTransition(async () => {
      try {
        await setPromotionActiveAction(promotion.id, next);
      } catch {
        setActive(!next);
        onToggleError("เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className={
            "flex size-11 shrink-0 items-center justify-center rounded-full " +
            (active
              ? "bg-primary-container/40 text-primary"
              : "bg-surface-container-high text-on-surface-variant")
          }
        >
          <Icon name="card_giftcard" size={22} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight">
              {promotion.title}
            </h3>
            <Chip size="sm" variant={active ? "success" : "neutral"}>
              {active ? "กำลังใช้งาน" : "พักไว้"}
            </Chip>
          </div>
          {promotion.description ? (
            <p className="text-label-md text-on-surface-variant/80 line-clamp-2">
              {promotion.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* The rule, spelled out. */}
      <div className="rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
        ใช้บริการครบ{" "}
        <span className="font-display font-bold text-primary tabular-nums">
          {promotion.requiredStamps}
        </span>{" "}
        ครั้ง รับ{" "}
        <span className="font-bold">{promotion.reward}</span>
      </div>

      <div className="flex items-center gap-4 text-label-md text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <Icon name="group" size={16} />
          กำลังสะสม {promotion.collectorCount.toLocaleString("th-TH")} คน
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="redeem" size={16} />
          แลกไปแล้ว {promotion.redeemedCount.toLocaleString("th-TH")} ครั้ง
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
        <Switch
          checked={active}
          disabled={pending}
          onChange={(e) => toggleActive(e.target.checked)}
          label={active ? "เปิด" : "ปิด"}
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            iconLeft={<Icon name="group" size={16} />}
            onClick={onViewCollectors}
          >
            ผู้สะสมแต้ม
          </Button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไขโปรโมชั่น"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label="ลบโปรโมชั่น"
                className="inline-flex items-center justify-center size-9 rounded-full text-error hover:bg-error-container/40 transition-colors"
              >
                <Icon name="delete" size={18} />
              </button>
            }
            title="ลบโปรโมชั่นนี้?"
            description={`"${promotion.title}" และแต้มสะสมของลูกค้าทั้งหมดในโปรโมชั่นนี้จะถูกลบถาวร`}
            confirmLabel="ลบ"
            cancelLabel="ยกเลิก"
            destructive
            onConfirm={() => deletePromotionAction(promotion.id)}
          />
        </div>
      </div>
    </li>
  );
}

function PromotionFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: ShopPromotionListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    PromotionFormState,
    FormData
  >(savePromotionAction, null);
  const [errors, setErrors] = useState<PromotionFormErrors>({});
  const [active, setActive] = useState(editing ? editing.isActive : true);

  // Close on a successful save (the component mounts fresh per open).
  useEffect(() => {
    if (state?.ok) {
      onSaved();
      onClose();
    }
  }, [state, onSaved, onClose]);

  function clientAction(formData: FormData) {
    const fieldErrors = validatePromotionForm(parsePromotionFormData(formData));
    if (hasPromotionErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return; // do not call the server on invalid input
    }
    setErrors({});
    formAction(formData);
  }

  const clearErr = (key: keyof PromotionFormErrors) => () =>
    setErrors((e) => ({ ...e, [key]: undefined }));

  // Constrain the required-count field at the source: digits only.
  function handleStampsInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    el.value = el.value.replace(/[^0-9]/g, "");
    clearErr("requiredStamps")();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "แก้ไขโปรโมชั่น" : "เพิ่มโปรโมชั่น"}
    >
      <form action={clientAction} noValidate className="space-y-5">
        {editing ? (
          <input type="hidden" name="promotionId" value={editing.id} />
        ) : null}
        {/* The toggle is UI state; submit its value via this hidden field. */}
        <input type="hidden" name="isActive" value={active ? "true" : "false"} />

        {state && !state.ok ? (
          <p className="rounded-lg bg-error-container/50 text-on-error-container text-label-md px-4 py-3">
            {state.message}
          </p>
        ) : null}

        <Input
          name="title"
          label="ชื่อโปรโมชั่น"
          required
          defaultValue={editing?.title ?? ""}
          placeholder="เช่น บัตรสะสมแต้มตัดผม"
          maxLength={120}
          errorText={errors.title}
          onChange={clearErr("title")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            name="requiredStamps"
            label="ใช้บริการครบกี่ครั้ง"
            required
            inputMode="numeric"
            defaultValue={editing ? String(editing.requiredStamps) : ""}
            placeholder="เช่น 10"
            helperText={`${MIN_REQUIRED_STAMPS}–${MAX_REQUIRED_STAMPS} ครั้ง`}
            errorText={errors.requiredStamps}
            onChange={handleStampsInput}
          />
          <Input
            name="reward"
            label="สิทธิ์ที่ลูกค้าจะได้รับ"
            required
            defaultValue={editing?.reward ?? ""}
            placeholder="เช่น ตัดผมฟรี 1 ครั้ง"
            maxLength={120}
            errorText={errors.reward}
            onChange={clearErr("reward")}
          />
        </div>

        <Textarea
          name="description"
          label="รายละเอียด"
          rows={2}
          defaultValue={editing?.description ?? ""}
          placeholder="เงื่อนไขเพิ่มเติม (ไม่บังคับ)"
          maxLength={500}
          errorText={errors.description}
          onChange={clearErr("description")}
        />

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
          <div>
            <p className="text-label-md text-on-surface">เปิดใช้งานโปรโมชั่น</p>
            <p className="text-label-sm text-on-surface-variant">
              เมื่อเปิด ลูกค้าจะได้แต้มอัตโนมัติเมื่อใช้บริการเสร็จสิ้น
            </p>
          </div>
          <Switch
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            aria-label="เปิดใช้งานโปรโมชั่น"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
            fullWidth
            className="flex-1"
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending} fullWidth className="flex-1">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ParticipantsModal({
  promotion,
  onClose,
  onToast,
}: {
  promotion: ShopPromotionListItem;
  onClose: () => void;
  onToast: (kind: "success" | "error", message: string) => void;
}) {
  const [participants, setParticipants] = useState<
    PromotionParticipant[] | null
  >(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  async function reload() {
    const rows = await loadPromotionParticipantsAction(promotion.id);
    setParticipants(rows);
  }

  useEffect(() => {
    let alive = true;
    loadPromotionParticipantsAction(promotion.id)
      .then((rows) => {
        if (alive) setParticipants(rows);
      })
      .catch(() => {
        if (alive) setParticipants([]);
      });
    return () => {
      alive = false;
    };
  }, [promotion.id]);

  async function redeem(phone: string) {
    setRedeeming(phone);
    try {
      const result = await redeemPromotionRewardAction(promotion.id, phone);
      if (result.ok) {
        onToast("success", `แลกสิทธิ์ "${promotion.reward}" สำเร็จ`);
        await reload();
      } else {
        onToast("error", result.message);
      }
    } catch {
      onToast("error", "แลกสิทธิ์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <Modal open onClose={onClose} title="ผู้สะสมแต้ม" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-label-md text-on-surface-variant">
          {promotion.title} · ใช้บริการครบ{" "}
          <span className="font-bold text-on-surface">
            {promotion.requiredStamps}
          </span>{" "}
          ครั้ง รับ{" "}
          <span className="font-bold text-on-surface">{promotion.reward}</span>
        </div>

        {participants === null ? (
          <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin" />
            กำลังโหลด…
          </div>
        ) : participants.length === 0 ? (
          <div className="py-10 text-center text-body-md text-on-surface-variant">
            ยังไม่มีลูกค้าสะสมแต้มในโปรโมชั่นนี้
          </div>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <ParticipantRow
                key={p.customerPhone}
                participant={p}
                requiredStamps={promotion.requiredStamps}
                rewardLabel={promotion.reward}
                redeeming={redeeming === p.customerPhone}
                onRedeem={() => redeem(p.customerPhone)}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function ParticipantRow({
  participant,
  requiredStamps,
  rewardLabel,
  redeeming,
  onRedeem,
}: {
  participant: PromotionParticipant;
  requiredStamps: number;
  rewardLabel: string;
  redeeming: boolean;
  onRedeem: () => void;
}) {
  const eligible = participant.redeemable >= 1;
  const pct = Math.round((participant.towardNext / requiredStamps) * 100);

  return (
    <li className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex items-center gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-on-surface truncate">
            {participant.customerName ?? participant.customerPhone}
          </span>
          {participant.customerName ? (
            <span className="text-label-sm text-on-surface-variant tabular-nums">
              {participant.customerPhone}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${eligible ? 100 : pct}%` }}
            />
          </div>
          <span className="text-label-sm text-on-surface-variant tabular-nums shrink-0">
            {eligible ? requiredStamps : participant.towardNext}/{requiredStamps}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-label-sm text-on-surface-variant">
          {eligible ? (
            <Chip size="sm" variant="success">
              พร้อมแลก{participant.redeemable > 1 ? ` ×${participant.redeemable}` : ""}
            </Chip>
          ) : null}
          {participant.redeemedCount > 0 ? (
            <span>แลกไปแล้ว {participant.redeemedCount} ครั้ง</span>
          ) : null}
        </div>
      </div>

      <Button
        size="sm"
        variant={eligible ? "primary" : "outline"}
        disabled={!eligible || redeeming}
        onClick={onRedeem}
        iconLeft={
          redeeming ? (
            <Icon name="progress_activity" size={16} className="animate-spin" />
          ) : (
            <Icon name="redeem" size={16} />
          )
        }
        title={eligible ? `แลก: ${rewardLabel}` : "แต้มยังไม่ครบ"}
      >
        แลกสิทธิ์
      </Button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary-container/40 text-primary flex items-center justify-center">
        <Icon name="card_giftcard" size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        ยังไม่มีโปรโมชั่น
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        สร้างบัตรสะสมแต้มให้ลูกค้า เช่น ใช้บริการครบ 10 ครั้ง รับตัดผมฟรี 1 ครั้ง —
        แต้มจะเพิ่มอัตโนมัติทุกครั้งที่งานเสร็จสิ้น
      </p>
      <Button onClick={onAdd} iconLeft={<Icon name="add" size={18} />}>
        สร้างโปรโมชั่นแรก
      </Button>
    </div>
  );
}
