/**
 * Shared shop-form validator + FormData parser.
 *
 * Pure module (no server-only, no DB): consumed by both the public
 * registration server action and the admin edit server action so the rules
 * stay in one place.
 *
 * SRP: validation only — no persistence, no redirects, no cookies.
 */

import {
  isValidProvince,
  isValidDistrict,
  isValidSubdistrict,
} from "@/lib/location/thailand";
import { isValidThaiPhone } from "@/lib/validation/phone";
import { isValidHandleFormat, isReservedHandle } from "@/lib/slug";

export type ShopFormFields = {
  name: string;
  categoryId: string;
  /**
   * Public URL handle (`/shops/{handle}`). Optional in this shared validator:
   * registration may leave it blank and let the service auto-generate one, while
   * the profile-edit action enforces required-ness separately. When present it
   * must be a valid, non-reserved handle. Stored/compared lowercase.
   */
  handle?: string;
  description?: string;
  address?: string;
  /** Thai province (จังหวัด) — canonical name; required. */
  province: string;
  /** Thai district (เขต/อำเภอ) — canonical name belonging to province; required. */
  district: string;
  /** Thai sub-district (แขวง/ตำบล) — canonical name belonging to district; required. */
  subdistrict: string;
  contactPhone?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
};

export type ShopFormErrors = Partial<Record<keyof ShopFormFields, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function parseShopFormData(formData: FormData): ShopFormFields {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    name: get("name"),
    categoryId: get("categoryId"),
    // Handles are case-insensitive and stored lowercase; normalise on the way in
    // so the validator, the DB unique index, and the URL all agree.
    handle: get("handle").toLowerCase() || undefined,
    description: get("description") || undefined,
    address: get("address") || undefined,
    province: get("province"),
    district: get("district"),
    subdistrict: get("subdistrict"),
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

  // Handle (public URL slug) is optional here — registration may omit it and let
  // the service auto-generate one; the profile-edit action enforces required-ness
  // itself. Validate only the SHAPE + reserved words when a value is present;
  // uniqueness is a DB concern checked in the service layer.
  if (input.handle) {
    if (!isValidHandleFormat(input.handle)) {
      errors.handle =
        "ลิงก์ร้านใช้ได้เฉพาะ a–z, 0–9 และ - (3–30 ตัว ไม่ขึ้นต้น/ลงท้าย หรือมี - ติดกัน)";
    } else if (isReservedHandle(input.handle)) {
      errors.handle = "ลิงก์ร้านนี้เป็นคำสงวน กรุณาเลือกคำอื่น";
    }
  }

  // Server-side length caps. The client forms set `maxLength`, but that is a
  // browser convenience only — a direct POST to the action bypasses it, and the
  // service inserts these verbatim, so the bound must live here (the canonical
  // location fields are implicitly bounded by the dataset membership check).
  if (input.description && input.description.length > 500)
    errors.description = "คำอธิบายต้องไม่เกิน 500 ตัวอักษร";

  if (input.address && input.address.length > 200)
    errors.address = "ที่อยู่ต้องไม่เกิน 200 ตัวอักษร";

  // Location is required and must be internally consistent: the district has to
  // belong to the chosen province. Both come from the same canonical dataset
  // (thailand.ts) the picker is built from, so a mismatch means a tampered or
  // stale submission, not normal use.
  if (!input.province) {
    errors.province = "กรุณาเลือกจังหวัด";
  } else if (!isValidProvince(input.province)) {
    errors.province = "จังหวัดไม่ถูกต้อง";
  }

  const districtConsistent =
    Boolean(input.province) &&
    isValidProvince(input.province) &&
    isValidDistrict(input.province, input.district);

  if (!input.district) {
    errors.district = "กรุณาเลือกเขต/อำเภอ";
  } else if (input.province && isValidProvince(input.province) && !districtConsistent) {
    errors.district = "เขต/อำเภอไม่ตรงกับจังหวัดที่เลือก";
  }

  if (!input.subdistrict) {
    errors.subdistrict = "กรุณาเลือกแขวง/ตำบล";
  } else if (
    districtConsistent &&
    !isValidSubdistrict(input.province, input.district, input.subdistrict)
  ) {
    errors.subdistrict = "แขวง/ตำบลไม่ตรงกับเขต/อำเภอที่เลือก";
  }

  if (!input.ownerName) errors.ownerName = "กรุณากรอกชื่อผู้ติดต่อ";
  else if (input.ownerName.length > 120)
    errors.ownerName = "ชื่อผู้ติดต่อต้องไม่เกิน 120 ตัวอักษร";

  if (!input.ownerPhone) {
    errors.ownerPhone = "กรุณากรอกเบอร์โทร";
  } else if (!isValidThaiPhone(input.ownerPhone)) {
    errors.ownerPhone = "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  if (input.contactPhone && !isValidThaiPhone(input.contactPhone)) {
    errors.contactPhone = "เบอร์โทรร้านไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  if (input.ownerEmail) {
    if (input.ownerEmail.length > 254) {
      errors.ownerEmail = "อีเมลต้องไม่เกิน 254 ตัวอักษร";
    } else if (!EMAIL_RE.test(input.ownerEmail)) {
      errors.ownerEmail = "รูปแบบอีเมลไม่ถูกต้อง";
    }
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

  if (input.phone && !isValidThaiPhone(input.phone)) {
    errors.phone = "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";
  }

  return errors;
}

export function hasStaffErrors(errors: StaffFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ----- Service (บริการ) form ------------------------------------------------

export type ServiceFormFields = {
  name: string;
  /** Raw string from the form input; validated/parsed to a number below. */
  durationMinutes: string;
  /** Raw string; empty means "no price". */
  price: string;
  description?: string;
  isActive: boolean;
};

export type ServiceFormErrors = Partial<
  Record<"name" | "durationMinutes" | "price" | "description", string>
>;

export function parseServiceFormData(formData: FormData): ServiceFormFields {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    name: get("name"),
    durationMinutes: get("durationMinutes"),
    price: get("price"),
    description: get("description") || undefined,
    // The service form always renders the active toggle, so an unchecked box
    // (which submits no value) means "inactive". Treat only an explicit
    // on/true/1 as active.
    isActive: ["on", "true", "1"].includes(get("isActive").toLowerCase()),
  };
}

export function validateServiceForm(input: ServiceFormFields): ServiceFormErrors {
  const errors: ServiceFormErrors = {};

  if (!input.name) errors.name = "กรุณากรอกชื่อบริการ";
  else if (input.name.length > 120)
    errors.name = "ชื่อบริการต้องไม่เกิน 120 ตัวอักษร";

  // Duration must be a 10-minute multiple in [10, 480] — the same grid the
  // booking slot-math and the DB CHECK enforce.
  if (!input.durationMinutes) {
    errors.durationMinutes = "กรุณากรอกระยะเวลา";
  } else {
    const duration = Number(input.durationMinutes);
    if (!Number.isInteger(duration)) {
      errors.durationMinutes = "ระยะเวลาต้องเป็นจำนวนเต็ม (นาที)";
    } else if (duration < 10 || duration > 480) {
      errors.durationMinutes = "ระยะเวลาต้องอยู่ระหว่าง 10–480 นาที";
    } else if (duration % 10 !== 0) {
      errors.durationMinutes = "ระยะเวลาต้องเป็นจำนวนเท่าของ 10 นาที";
    }
  }

  // Price is optional. When provided it must be a non-negative number with at
  // most two decimal places.
  if (input.price) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.price = "ราคาต้องเป็นตัวเลขไม่ติดลบ";
    } else if (Math.round(price * 100) !== price * 100) {
      errors.price = "ราคามีทศนิยมได้ไม่เกิน 2 ตำแหน่ง";
    } else if (price > 1_000_000) {
      errors.price = "ราคาสูงเกินไป";
    }
  }

  if (input.description && input.description.length > 500)
    errors.description = "รายละเอียดต้องไม่เกิน 500 ตัวอักษร";

  return errors;
}

export function hasServiceErrors(errors: ServiceFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
