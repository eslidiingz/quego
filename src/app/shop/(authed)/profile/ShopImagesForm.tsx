"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { shopImageUrl } from "@/lib/r2/url";
import type { ShopImageSlot, ShopListItem } from "@/lib/services/shops";
import { updateShopImagesAction } from "./actions";

const SLOT_SUCCESS: Record<ShopImageSlot, string> = {
  logo: "อัปเดตโลโก้แล้ว",
  cover: "อัปเดตรูปปกแล้ว",
};

/** Builds the per-slot FormData the action expects, then dispatches it. */
function buildFormData(slot: ShopImageSlot, file: File): FormData {
  const fd = new FormData();
  fd.set("slot", slot);
  fd.set("file", file);
  return fd;
}

/**
 * SRP: own the logo+cover upload surface. One `useActionState` drives both
 * slots (the action echoes back `slot` so the toast/error lands on the right
 * field). Optimistic previews show the just-cropped image immediately; a
 * server error clears them and surfaces inline on that slot.
 */
export function ShopImagesForm({ shop }: { shop: ShopListItem }) {
  const [state, dispatch] = useActionState(updateShopImagesAction, null);
  const [isPending, startTransition] = useTransition();

  // Which slot is currently in flight — so only its field shows the busy state.
  const [pendingSlot, setPendingSlot] = useState<ShopImageSlot | null>(null);
  // Optimistic object-URL previews keyed by slot (cleared once the action settles).
  const [preview, setPreview] = useState<Partial<Record<ShopImageSlot, string>>>({});
  const [toast, setToast] = useState<string | null>(null);

  const savedLogoUrl = shopImageUrl(shop.logo_key);
  const savedCoverUrl = shopImageUrl(shop.cover_key);

  // React to the action settling: success → toast + drop the optimistic
  // preview (revalidated server data now carries the real URL); failure →
  // also drop the preview so the field falls back to the last-saved image and
  // the inline error shows.
  useEffect(() => {
    if (!state) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingSlot(null);
    if (state.ok) {
      setToast(SLOT_SUCCESS[state.slot]);
    }
    // Drop the optimistic preview for the settled slot (revalidated server data
    // now carries the real URL). The functional updater avoids reading `preview`
    // from the closure, so `[state]` is a complete dependency list.
    setPreview((prev) => {
      const next = { ...prev };
      if (state.slot) {
        const url = next[state.slot];
        if (url) URL.revokeObjectURL(url);
        delete next[state.slot];
      }
      return next;
    });
  }, [state]);

  const submit = (slot: ShopImageSlot, file: File) => {
    setPendingSlot(slot);
    setPreview((prev) => {
      const next = { ...prev };
      const old = next[slot];
      if (old) URL.revokeObjectURL(old);
      next[slot] = URL.createObjectURL(file);
      return next;
    });
    startTransition(() => {
      dispatch(buildFormData(slot, file));
    });
  };

  const errorFor = (slot: ShopImageSlot): string | undefined =>
    state && !state.ok && state.slot === slot ? state.message : undefined;

  // Effective URL per slot: an optimistic preview (the just-cropped image) wins
  // while a change is in flight; otherwise fall back to the last-saved image.
  const logoUrl = preview.logo ?? savedLogoUrl;
  const coverUrl = preview.cover ?? savedCoverUrl;

  const busy = (slot: ShopImageSlot) => isPending && pendingSlot === slot;

  return (
    <>
      {toast ? (
        <Toast kind="success" message={toast} onDismiss={() => setToast(null)} />
      ) : null}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8 space-y-6">
        <header className="flex items-start gap-3 pb-4 border-b border-outline-variant/40">
          <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="image" />
          </span>
          <div>
            <h2 className="font-display text-headline-md text-on-surface">รูปร้าน</h2>
            <p className="text-label-md text-on-surface-variant mt-1">
              โลโก้และรูปปกที่ลูกค้าจะเห็นบนหน้าร้าน
            </p>
          </div>
        </header>

        {/* Facebook-style: a wide cover band, with the round logo field pulled up
            (negative margin) so its circle overlaps the cover's bottom-left edge.
            Each ImageUploadField stays fully self-contained (its own media box +
            controls + inline error) — the overlap is pure layout, so the fields
            remain reusable. The logo controls sit below the overlapping circle. */}
        <div>
          <ImageUploadField
            label="รูปปก"
            shape="rect"
            aspect={1600 / 600}
            currentUrl={coverUrl}
            cropTitle="ปรับรูปปก"
            busy={busy("cover")}
            error={errorFor("cover")}
            onPick={(file) => submit("cover", file)}
            fallback={
              <div className="bg-luxury-gradient absolute inset-0 flex flex-col items-center justify-center gap-1 text-inverse-on-surface/90">
                <Icon name="add_photo_alternate" size={28} />
                <span className="text-label-md">เพิ่มรูปปก</span>
              </div>
            }
          />

          {/* Pull the logo up so its circle overlaps the cover band above. A
              ring against the card surface keeps it readable over any cover. */}
          <div className="-mt-14 pl-2 sm:pl-4">
            <ImageUploadField
              label="โลโก้ร้าน"
              shape="round"
              aspect={1}
              currentUrl={logoUrl}
              cropTitle="ปรับโลโก้"
              busy={busy("logo")}
              error={errorFor("logo")}
              mediaClassName="ring-4 ring-surface-container-lowest"
              onPick={(file) => submit("logo", file)}
              fallback={
                <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
                  <Icon name="storefront" size={36} />
                </div>
              }
            />
          </div>
        </div>

        <div className="space-y-2 text-label-sm text-on-surface-variant">
          <p className="flex items-center gap-1.5">
            <Icon name="photo_camera" size={16} className="text-on-surface-variant" />
            แตะไอคอนกล้องบนรูปเพื่อเพิ่มหรือเปลี่ยนรูป
          </p>
          <ul className="space-y-1 pl-1">
            <li className="flex gap-2">
              <span className="text-on-surface-variant/60">•</span>
              <span>
                <span className="text-on-surface">โลโก้</span> — รูปสี่เหลี่ยมจัตุรัส (สัดส่วน 1:1)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-on-surface-variant/60">•</span>
              <span>
                <span className="text-on-surface">รูปปก</span> — รูปแนวนอน (สัดส่วนกว้างประมาณ 3:1)
              </span>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
