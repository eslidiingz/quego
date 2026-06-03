/**
 * Shared shop-form validator + FormData parser.
 *
 * Pure module (no server-only, no DB): consumed by both the public
 * registration server action and the admin edit server action so the rules
 * stay in one place.
 *
 * SRP: validation only — no persistence, no redirects, no cookies.
 */

export type ShopFormFields = {
  name: string;
  categoryId: string;
  description?: string;
  address?: string;
  contactPhone?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
};

export type ShopFormErrors = Partial<Record<keyof ShopFormFields, string>>;

const PHONE_RE = /^0\d{9}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function parseShopFormData(formData: FormData): ShopFormFields {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    name: get("name"),
    categoryId: get("categoryId"),
    description: get("description") || undefined,
    address: get("address") || undefined,
    contactPhone: get("contactPhone") || undefined,
    ownerName: get("ownerName"),
    ownerPhone: get("ownerPhone"),
    ownerEmail: get("ownerEmail") || undefined,
  };
}

export function validateShopForm(input: ShopFormFields): ShopFormErrors {
  const errors: ShopFormErrors = {};

  if (!input.name) errors.name = "กรุณากรอกชื่อร้าน";
  else if (input.name.length > 120)
    errors.name = "ชื่อร้านต้องไม่เกิน 120 ตัวอักษร";

  if (!input.categoryId) errors.categoryId = "กรุณาเลือกประเภทธุรกิจ";

  if (!input.ownerName) errors.ownerName = "กรุณากรอกชื่อผู้ติดต่อ";

  if (!input.ownerPhone) {
    errors.ownerPhone = "กรุณากรอกเบอร์โทร";
  } else if (!PHONE_RE.test(input.ownerPhone)) {
    errors.ownerPhone = "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  if (input.contactPhone && !PHONE_RE.test(input.contactPhone)) {
    errors.contactPhone = "เบอร์โทรร้านไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  if (input.ownerEmail && !EMAIL_RE.test(input.ownerEmail)) {
    errors.ownerEmail = "รูปแบบอีเมลไม่ถูกต้อง";
  }

  return errors;
}

export function hasErrors(errors: ShopFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ----- Staff (พนักงาน) form -------------------------------------------------

export type StaffFormFields = {
  name: string;
  nickname?: string;
  role?: string;
  phone?: string;
  isActive: boolean;
};

export type StaffFormErrors = Partial<
  Record<"name" | "nickname" | "role" | "phone", string>
>;

export function parseStaffFormData(formData: FormData): StaffFormFields {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    name: get("name"),
    nickname: get("nickname") || undefined,
    role: get("role") || undefined,
    phone: get("phone") || undefined,
    // The staff form always renders the active toggle, so an unchecked box
    // (which submits no value) means "inactive". Treat only an explicit
    // on/true/1 as active.
    isActive: ["on", "true", "1"].includes(get("isActive").toLowerCase()),
  };
}

export function validateStaffForm(input: StaffFormFields): StaffFormErrors {
  const errors: StaffFormErrors = {};

  if (!input.name) errors.name = "กรุณากรอกชื่อพนักงาน";
  else if (input.name.length > 120)
    errors.name = "ชื่อพนักงานต้องไม่เกิน 120 ตัวอักษร";

  if (input.nickname && input.nickname.length > 60)
    errors.nickname = "ชื่อเล่นต้องไม่เกิน 60 ตัวอักษร";

  if (input.role && input.role.length > 60)
    errors.role = "ตำแหน่งต้องไม่เกิน 60 ตัวอักษร";

  if (input.phone && !PHONE_RE.test(input.phone)) {
    errors.phone = "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  return errors;
}

export function hasStaffErrors(errors: StaffFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
