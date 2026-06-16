"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Toast, type ToastKind } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PinInput } from "@/components/ui/PinInput";
import { LocationSearchPicker } from "@/components/ui/LocationSearchPicker";
import { LocationCombobox, type LocationValue } from "@/components/ui/LocationCombobox";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Subsection, DemoCard, DemoLabel } from "./kit";

/**
 * Live gallery of every shared UI primitive, rendered from the real components
 * (not copies) so the page can never drift from production. This is a client
 * island because Input/Select/Textarea/Switch call `useId`, and the overlays
 * (Modal/Toast/ConfirmDialog) drive their own state.
 */
export function ComponentGallery() {
  const [notif, setNotif] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loc, setLoc] = useState<LocationValue | null>(null);
  const [toast, setToast] = useState<{ id: number; kind: ToastKind; message: string } | null>(
    null,
  );

  const showToast = (kind: ToastKind, message: string) =>
    setToast({ id: Date.now(), kind, message });

  return (
    <div className="space-y-10">
      {/* ---------- Buttons ---------- */}
      <Subsection title="Buttons" className="space-y-5">
        <DemoCard>
          <DemoLabel>variants</DemoLabel>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">หลัก</Button>
            <Button variant="secondary">รอง</Button>
            <Button variant="outline">เส้นขอบ</Button>
            <Button variant="ghost">โปร่ง</Button>
            <Button variant="destructive">ลบ</Button>
          </div>
        </DemoCard>

        <DemoCard>
          <DemoLabel>sizes — md (h-11 = 44px) คือ baseline touch target</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">sm</Button>
            <Button size="md">md</Button>
            <Button size="lg">lg</Button>
            <Button size="xl">xl</Button>
          </div>
        </DemoCard>

        <DemoCard>
          <DemoLabel>icons · disabled · full-width</DemoLabel>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button iconLeft={<Icon name="search" size={20} />}>ค้นหา</Button>
              <Button variant="outline" iconRight={<Icon name="arrow_forward" size={20} />}>
                ถัดไป
              </Button>
              <Button disabled>ปิดใช้งาน</Button>
            </div>
            <Button fullWidth iconLeft={<Icon name="add" size={20} />}>
              กดรับคิว
            </Button>
          </div>
        </DemoCard>

        <DemoCard>
          <DemoLabel>paired actions — กว้าง/สูงเท่ากัน (visual balance)</DemoLabel>
          <div className="flex gap-3 [&>*]:flex-1">
            <Button variant="outline">ยกเลิก</Button>
            <Button variant="primary">ยืนยัน</Button>
          </div>
        </DemoCard>
      </Subsection>

      {/* ---------- Inputs & forms ---------- */}
      <Subsection title="Inputs & forms" className="space-y-5">
        <DemoCard className="space-y-4">
          <Input
            label="ชื่อร้าน"
            placeholder="เช่น ร้านตัดผมลุงโต"
            required
            iconLeft={<Icon name="storefront" size={20} />}
          />
          <Input
            label="อีเมล"
            placeholder="you@example.com"
            helperText="ใช้สำหรับรับการแจ้งเตือน"
          />
          <Input
            label="เบอร์โทร"
            defaultValue="08x"
            errorText="กรุณากรอกเบอร์ให้ครบ 10 หลัก"
          />
          <Select label="ประเภทร้าน" required defaultValue="">
            <option value="" disabled>
              เลือกประเภท
            </option>
            <option value="barber">ร้านตัดผม</option>
            <option value="salon">แฮร์ซาลอน</option>
            <option value="massage">ร้านนวด</option>
            <option value="spa">สปา</option>
            <option value="nail">ทำเล็บ</option>
          </Select>
          <Textarea label="รายละเอียด" placeholder="บอกลูกค้าเกี่ยวกับร้านของคุณ" rows={3} />
          <Input label="ปิดใช้งาน" defaultValue="แก้ไขไม่ได้" disabled />
        </DemoCard>

        <DemoCard>
          <DemoLabel>switch</DemoLabel>
          <Switch
            label={`การแจ้งเตือน — ${notif ? "เปิด" : "ปิด"}`}
            checked={notif}
            onChange={(e) => setNotif(e.target.checked)}
          />
        </DemoCard>

        <DemoCard className="space-y-4">
          <DemoLabel>PhoneInput — รับเฉพาะตัวเลข (จำกัด 10 หลัก, ตัดอักขระอื่นทิ้งทันที)</DemoLabel>
          <PhoneInput
            label="เบอร์โทร"
            placeholder="08X-XXX-XXXX"
            value={phone}
            onChange={setPhone}
            iconLeft={<Icon name="call" size={20} />}
          />
          <p className="text-label-sm text-on-surface-variant">
            ค่าที่เก็บจริง (digits): <code>{phone || "—"}</code>
          </p>
        </DemoCard>

        <DemoCard className="space-y-4">
          <DemoLabel>PinInput — ช่องแยกตามหลัก (OTP), ตัวเลขล้วน, วาง/ลบ/ลูกศรได้</DemoLabel>
          <PinInput label="รหัส PIN" value={pin} onChange={setPin} visible />
          <p className="text-label-sm text-on-surface-variant">
            ค่าปัจจุบัน: <code>{pin || "—"}</code>
          </p>
        </DemoCard>

        <DemoCard>
          <DemoLabel>FormSection — กรอบจัดกลุ่มฟิลด์</DemoLabel>
          <FormSection
            icon="badge"
            title="ข้อมูลติดต่อ"
            description="ใช้แสดงในหน้าโปรไฟล์ร้าน"
          >
            <Input label="ชื่อผู้ติดต่อ" placeholder="ชื่อ-นามสกุล" />
            <Input label="Line ID" placeholder="@yourshop" />
          </FormSection>
        </DemoCard>
      </Subsection>

      {/* ---------- Location pickers ---------- */}
      <Subsection title="Location pickers" className="space-y-5">
        <DemoCard className="space-y-3">
          <DemoLabel>
            LocationSearchPicker — ตำบล → อำเภอ → จังหวัด (ใช้ในฟอร์มร้านทุกหน้า)
          </DemoLabel>
          <LocationSearchPicker />
        </DemoCard>

        <DemoCard className="space-y-3">
          <DemoLabel>
            LocationCombobox — ค้นหาพื้นที่ช่องเดียว (ใช้ใน hero / ตัวกรองหน้าค้นหา)
          </DemoLabel>
          <LocationCombobox value={loc} onChange={setLoc} />
          <p className="text-label-sm text-on-surface-variant">
            เลือก: <code>{loc ? [loc.subdistrict, loc.district, loc.province].filter(Boolean).join(", ") : "—"}</code>
          </p>
        </DemoCard>
      </Subsection>

      {/* ---------- Chips / status ---------- */}
      <Subsection title="Chips & status" className="space-y-5">
        <DemoCard>
          <DemoLabel>variants</DemoLabel>
          <div className="flex flex-wrap gap-2">
            <Chip variant="neutral">ทั่วไป</Chip>
            <Chip variant="waiting">รอคิว</Chip>
            <Chip variant="now-serving" pulse>
              กำลังให้บริการ
            </Chip>
            <Chip variant="delayed">เลื่อนคิว</Chip>
            <Chip variant="vip">VIP</Chip>
            <Chip variant="premium">พรีเมียม</Chip>
            <Chip variant="confirmed">ยืนยันแล้ว</Chip>
            <Chip variant="success">สำเร็จ</Chip>
            <Chip variant="danger">ยกเลิก</Chip>
          </div>
        </DemoCard>
        <DemoCard>
          <DemoLabel>sizes · icon</DemoLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="waiting" size="sm">
              sm
            </Chip>
            <Chip variant="waiting" size="md">
              md
            </Chip>
            <Chip variant="vip" iconLeft={<Icon name="workspace_premium" size={14} />}>
              ลูกค้าประจำ
            </Chip>
          </div>
        </DemoCard>
      </Subsection>

      {/* ---------- Avatars ---------- */}
      <Subsection title="Avatars" className="space-y-5">
        <DemoCard>
          <DemoLabel>sizes</DemoLabel>
          <div className="flex flex-wrap items-end gap-3">
            <Avatar initials="ก" size="sm" />
            <Avatar initials="ข" size="md" />
            <Avatar initials="ค" size="lg" />
            <Avatar initials="ง" size="xl" />
          </div>
        </DemoCard>
        <DemoCard>
          <DemoLabel>ring · status</DemoLabel>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar initials="P" ring="primary" />
            <Avatar initials="S" ring="secondary" />
            <Avatar initials="A" status="online" />
            <Avatar initials="B" status="away" />
            <Avatar initials="C" status="offline" />
          </div>
        </DemoCard>
      </Subsection>

      {/* ---------- Icons ---------- */}
      <Subsection title="Icons" className="space-y-5">
        <DemoCard>
          <DemoLabel>Material Symbols ผ่าน &lt;Icon /&gt; — outline / filled / weight</DemoLabel>
          <div className="flex flex-wrap items-center gap-5 text-primary">
            {["storefront", "schedule", "notifications", "person", "star", "bookmark"].map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              ),
            )}
            <Icon name="favorite" size={28} filled className="text-secondary" />
            <Icon name="star" size={28} weight={700} className="text-tertiary" />
          </div>
        </DemoCard>
      </Subsection>

      {/* ---------- Page header ---------- */}
      <Subsection title="Page header" className="space-y-5">
        <DemoCard>
          <PageHeader
            eyebrow="ภาพรวม"
            title="คิววันนี้"
            badge={
              <Chip variant="now-serving" pulse>
                สด
              </Chip>
            }
            action={
              <Button size="sm" iconLeft={<Icon name="add" size={18} />}>
                เพิ่มคิว
              </Button>
            }
            description="จัดการคิวลูกค้าและเรียกคิวถัดไปได้จากที่นี่"
          />
        </DemoCard>
      </Subsection>

      {/* ---------- Brand & chrome ---------- */}
      <Subsection title="Brand & chrome" className="space-y-5">
        <DemoCard className="flex flex-wrap items-center gap-6">
          <div>
            <DemoLabel>QuegoWordmark — โลโก้ตัวอักษร (จุดท้ายสีคอรัล)</DemoLabel>
            <div className="flex flex-wrap items-center gap-5">
              <QuegoWordmark />
              <QuegoWordmark className="text-[34px]" />
            </div>
          </div>
        </DemoCard>
        <DemoCard>
          <DemoLabel>ThemeToggle — สลับสว่าง/มืด (กดเพื่อสลับทั้งหน้า)</DemoLabel>
          <ThemeToggle />
        </DemoCard>
      </Subsection>

      {/* ---------- Overlays ---------- */}
      <Subsection title="Overlays & feedback" className="space-y-5">
        <DemoCard>
          <DemoLabel>modal · confirm · toast — ทุก action ต้องมีผลลัพธ์ที่ชัดเจน</DemoLabel>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              เปิด Modal
            </Button>

            <ConfirmDialog
              trigger={<Button variant="destructive">ลบร้าน</Button>}
              title="ลบร้านนี้?"
              description="การลบจะนำร้านออกจากระบบถาวร ลูกค้าจะค้นหาไม่เจออีก"
              destructive
              confirmLabel="ลบเลย"
              onConfirm={async () => {
                await new Promise((r) => setTimeout(r, 700));
                showToast("success", "ลบร้านเรียบร้อยแล้ว");
              }}
            />

            <Button variant="ghost" onClick={() => showToast("success", "บันทึกสำเร็จ")}>
              Toast สำเร็จ
            </Button>
            <Button variant="ghost" onClick={() => showToast("error", "เกิดข้อผิดพลาด")}>
              Toast ผิดพลาด
            </Button>
            <Button variant="ghost" onClick={() => showToast("info", "มีคิวใหม่เข้ามา")}>
              Toast ข้อมูล
            </Button>
          </div>
        </DemoCard>
      </Subsection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ตัวอย่าง Modal"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              ปิด
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                showToast("success", "ยืนยันแล้ว");
              }}
            >
              ยืนยัน
            </Button>
          </>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          Modal portal ไปที่ <code>document.body</code> เพื่อหนี stacking context
          ของ ancestor ที่มี <code>transform</code> — กด Esc หรือคลิกพื้นหลังเพื่อปิดได้
        </p>
      </Modal>

      {toast ? (
        <Toast
          key={toast.id}
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
