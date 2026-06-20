import { describe, it, expect } from "vitest";
import {
  parseShopFormData,
  validateShopForm,
  hasErrors,
  parseStaffFormData,
  validateStaffForm,
  hasStaffErrors,
  parseServiceFormData,
  validateServiceForm,
  hasServiceErrors,
  parseExpenseFormData,
  validateExpenseForm,
  hasExpenseErrors,
  type ShopFormFields,
  type StaffFormFields,
  type ServiceFormFields,
  type ExpenseFormFields,
} from "./shop";

// A genuinely valid (province → district → subdistrict) triple straight from
// src/lib/location/thailand.ts:
//   DISTRICTS_BY_PROVINCE["กระบี่"] includes "เมืองกระบี่"
//   SUBDISTRICTS_BY_DISTRICT["กระบี่|เมืองกระบี่"] includes "กระบี่น้อย"
const VALID_PROVINCE = "กระบี่";
const VALID_DISTRICT = "เมืองกระบี่";
const VALID_SUBDISTRICT = "กระบี่น้อย";

/** Fully-valid ShopFormFields; override per test via spread. */
function validBase(overrides: Partial<ShopFormFields> = {}): ShopFormFields {
  return {
    name: "ร้านตัดผมลุงโจ",
    categoryId: "cat-123",
    description: undefined,
    address: undefined,
    province: VALID_PROVINCE,
    district: VALID_DISTRICT,
    subdistrict: VALID_SUBDISTRICT,
    contactPhone: undefined,
    ownerName: "สมชาย ใจดี",
    ownerPhone: "0812345678",
    ownerEmail: undefined,
    ...overrides,
  };
}

describe("parseShopFormData", () => {
  it("trims whitespace from every field", () => {
    const fd = new FormData();
    fd.set("name", "  ร้านตัดผม  ");
    fd.set("categoryId", "  cat-1  ");
    fd.set("description", "  รายละเอียด  ");
    fd.set("address", "  123 ถนน  ");
    fd.set("province", `  ${VALID_PROVINCE}  `);
    fd.set("district", `  ${VALID_DISTRICT}  `);
    fd.set("subdistrict", `  ${VALID_SUBDISTRICT}  `);
    fd.set("contactPhone", "  0812345678  ");
    fd.set("ownerName", "  สมชาย  ");
    fd.set("ownerPhone", "  0898765432  ");
    fd.set("ownerEmail", "  a@b.co  ");

    const parsed = parseShopFormData(fd);

    expect(parsed).toEqual({
      name: "ร้านตัดผม",
      categoryId: "cat-1",
      description: "รายละเอียด",
      address: "123 ถนน",
      province: VALID_PROVINCE,
      district: VALID_DISTRICT,
      subdistrict: VALID_SUBDISTRICT,
      contactPhone: "0812345678",
      ownerName: "สมชาย",
      ownerPhone: "0898765432",
      ownerEmail: "a@b.co",
    });
  });

  it("turns empty optional fields into undefined", () => {
    const fd = new FormData();
    fd.set("name", "ร้าน");
    fd.set("categoryId", "cat-1");
    fd.set("description", "");
    fd.set("address", "   ");
    fd.set("province", VALID_PROVINCE);
    fd.set("district", VALID_DISTRICT);
    fd.set("subdistrict", VALID_SUBDISTRICT);
    fd.set("contactPhone", "");
    fd.set("ownerName", "สมชาย");
    fd.set("ownerPhone", "0812345678");
    fd.set("ownerEmail", "  ");

    const parsed = parseShopFormData(fd);

    expect(parsed.description).toBeUndefined();
    expect(parsed.address).toBeUndefined();
    expect(parsed.contactPhone).toBeUndefined();
    expect(parsed.ownerEmail).toBeUndefined();
  });

  it("keeps required string fields as empty strings when absent", () => {
    const fd = new FormData();
    const parsed = parseShopFormData(fd);

    expect(parsed.name).toBe("");
    expect(parsed.categoryId).toBe("");
    expect(parsed.province).toBe("");
    expect(parsed.district).toBe("");
    expect(parsed.subdistrict).toBe("");
    expect(parsed.ownerName).toBe("");
    expect(parsed.ownerPhone).toBe("");
  });
});

describe("validateShopForm", () => {
  it("returns no errors for a fully-valid input", () => {
    const errors = validateShopForm(validBase());
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it("returns no errors when all optional fields are valid too", () => {
    const errors = validateShopForm(
      validBase({
        description: "ร้านตัดผมเปิดมา 10 ปี",
        address: "123 ถนนสุขุมวิท",
        contactPhone: "0212345678",
        ownerEmail: "owner@example.com",
      }),
    );
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it("requires name", () => {
    const errors = validateShopForm(validBase({ name: "" }));
    expect(errors.name).toBe("กรุณากรอกชื่อร้าน");
  });

  it("caps name at 120 characters", () => {
    const errors = validateShopForm(validBase({ name: "n".repeat(121) }));
    expect(errors.name).toBe("ชื่อร้านต้องไม่เกิน 120 ตัวอักษร");
  });

  it("accepts a name of exactly 120 characters", () => {
    const errors = validateShopForm(validBase({ name: "n".repeat(120) }));
    expect(errors.name).toBeUndefined();
  });

  it("requires categoryId", () => {
    const errors = validateShopForm(validBase({ categoryId: "" }));
    expect(errors.categoryId).toBe("กรุณาเลือกประเภทธุรกิจ");
  });

  it("caps description at 500 characters", () => {
    const errors = validateShopForm(
      validBase({ description: "d".repeat(501) }),
    );
    expect(errors.description).toBe("คำอธิบายต้องไม่เกิน 500 ตัวอักษร");
  });

  it("caps address at 200 characters", () => {
    const errors = validateShopForm(validBase({ address: "a".repeat(201) }));
    expect(errors.address).toBe("ที่อยู่ต้องไม่เกิน 200 ตัวอักษร");
  });

  it("requires province when missing", () => {
    const errors = validateShopForm(validBase({ province: "" }));
    expect(errors.province).toBe("กรุณาเลือกจังหวัด");
  });

  it("rejects an unknown province", () => {
    const errors = validateShopForm(
      validBase({ province: "เมืองสมมติ" }),
    );
    expect(errors.province).toBe("จังหวัดไม่ถูกต้อง");
  });

  it("requires district when missing", () => {
    const errors = validateShopForm(validBase({ district: "" }));
    expect(errors.district).toBe("กรุณาเลือกเขต/อำเภอ");
  });

  it("rejects a district that does not belong to the chosen province", () => {
    // "เขตคลองเตย" is a Bangkok district, not a กระบี่ district.
    const errors = validateShopForm(
      validBase({ district: "เขตคลองเตย" }),
    );
    expect(errors.district).toBe("เขต/อำเภอไม่ตรงกับจังหวัดที่เลือก");
  });

  it("requires subdistrict when missing", () => {
    const errors = validateShopForm(validBase({ subdistrict: "" }));
    expect(errors.subdistrict).toBe("กรุณาเลือกแขวง/ตำบล");
  });

  it("rejects a subdistrict that does not belong to the chosen district", () => {
    // "อ่าวนาง" is a real subdistrict of เมืองกระบี่... so pick one that is NOT.
    const errors = validateShopForm(
      validBase({ subdistrict: "ไม่มีแขวงนี้" }),
    );
    expect(errors.subdistrict).toBe("แขวง/ตำบลไม่ตรงกับเขต/อำเภอที่เลือก");
  });

  it("requires ownerName", () => {
    const errors = validateShopForm(validBase({ ownerName: "" }));
    expect(errors.ownerName).toBe("กรุณากรอกชื่อผู้ติดต่อ");
  });

  it("caps ownerName at 120 characters", () => {
    const errors = validateShopForm(
      validBase({ ownerName: "o".repeat(121) }),
    );
    expect(errors.ownerName).toBe("ชื่อผู้ติดต่อต้องไม่เกิน 120 ตัวอักษร");
  });

  it("requires ownerPhone", () => {
    const errors = validateShopForm(validBase({ ownerPhone: "" }));
    expect(errors.ownerPhone).toBe("กรุณากรอกเบอร์โทร");
  });

  it("accepts a valid 10-digit ownerPhone starting with 0", () => {
    const errors = validateShopForm(validBase({ ownerPhone: "0812345678" }));
    expect(errors.ownerPhone).toBeUndefined();
  });

  it("rejects an ownerPhone that is too short", () => {
    const errors = validateShopForm(validBase({ ownerPhone: "123" }));
    expect(errors.ownerPhone).toBe("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
  });

  it("rejects an ownerPhone that is too long", () => {
    const errors = validateShopForm(validBase({ ownerPhone: "08123456789" }));
    expect(errors.ownerPhone).toBe("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
  });

  it("rejects an ownerPhone that does not start with 0", () => {
    const errors = validateShopForm(validBase({ ownerPhone: "1812345678" }));
    expect(errors.ownerPhone).toBe("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
  });

  it("leaves contactPhone unvalidated when absent", () => {
    const errors = validateShopForm(validBase({ contactPhone: undefined }));
    expect(errors.contactPhone).toBeUndefined();
  });

  it("accepts a valid contactPhone", () => {
    const errors = validateShopForm(validBase({ contactPhone: "0212345678" }));
    expect(errors.contactPhone).toBeUndefined();
  });

  it("rejects an invalid contactPhone when present", () => {
    const errors = validateShopForm(validBase({ contactPhone: "12345" }));
    expect(errors.contactPhone).toBe(
      "เบอร์โทรร้านไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)",
    );
  });

  it("leaves ownerEmail unvalidated when absent", () => {
    const errors = validateShopForm(validBase({ ownerEmail: undefined }));
    expect(errors.ownerEmail).toBeUndefined();
  });

  it("accepts a valid ownerEmail", () => {
    const errors = validateShopForm(validBase({ ownerEmail: "a@b.co" }));
    expect(errors.ownerEmail).toBeUndefined();
  });

  it("caps ownerEmail at 254 characters", () => {
    const longEmail = `${"a".repeat(250)}@b.co`; // 255 chars
    const errors = validateShopForm(validBase({ ownerEmail: longEmail }));
    expect(errors.ownerEmail).toBe("อีเมลต้องไม่เกิน 254 ตัวอักษร");
  });

  it("rejects an email with no @", () => {
    const errors = validateShopForm(validBase({ ownerEmail: "nope" }));
    expect(errors.ownerEmail).toBe("รูปแบบอีเมลไม่ถูกต้อง");
  });

  it("rejects an email with no dot in the domain", () => {
    const errors = validateShopForm(validBase({ ownerEmail: "a@b" }));
    expect(errors.ownerEmail).toBe("รูปแบบอีเมลไม่ถูกต้อง");
  });

  it("reports multiple independent errors at once", () => {
    const errors = validateShopForm(
      validBase({ name: "", categoryId: "", ownerPhone: "bad" }),
    );
    expect(errors.name).toBe("กรุณากรอกชื่อร้าน");
    expect(errors.categoryId).toBe("กรุณาเลือกประเภทธุรกิจ");
    expect(errors.ownerPhone).toBe("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
    expect(hasErrors(errors)).toBe(true);
  });
});

describe("hasErrors", () => {
  it("is false for an empty errors object", () => {
    expect(hasErrors({})).toBe(false);
  });

  it("is true when at least one key is present", () => {
    expect(hasErrors({ name: "กรุณากรอกชื่อร้าน" })).toBe(true);
  });
});

// ----- Staff ----------------------------------------------------------------

function validStaff(overrides: Partial<StaffFormFields> = {}): StaffFormFields {
  return {
    name: "ช่างเอ",
    nickname: undefined,
    role: undefined,
    phone: undefined,
    isActive: true,
    ...overrides,
  };
}

describe("parseStaffFormData", () => {
  it("trims and nulls out empty optionals", () => {
    const fd = new FormData();
    fd.set("name", "  ช่างเอ  ");
    fd.set("nickname", "  เอ  ");
    fd.set("role", "  ช่างตัดผม  ");
    fd.set("phone", "  0812345678  ");
    fd.set("isActive", "on");

    const parsed = parseStaffFormData(fd);

    expect(parsed.name).toBe("ช่างเอ");
    expect(parsed.nickname).toBe("เอ");
    expect(parsed.role).toBe("ช่างตัดผม");
    expect(parsed.phone).toBe("0812345678");
    expect(parsed.isActive).toBe(true);
  });

  it("collapses empty optional fields to undefined", () => {
    const fd = new FormData();
    fd.set("name", "ช่างเอ");
    fd.set("nickname", "");
    fd.set("role", "   ");
    fd.set("phone", "");

    const parsed = parseStaffFormData(fd);

    expect(parsed.nickname).toBeUndefined();
    expect(parsed.role).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
  });

  it.each(["on", "true", "1", "ON", "True", "TRUE"])(
    "treats %s as active",
    (value) => {
      const fd = new FormData();
      fd.set("name", "ช่างเอ");
      fd.set("isActive", value);
      expect(parseStaffFormData(fd).isActive).toBe(true);
    },
  );

  it("treats a missing isActive field as inactive", () => {
    const fd = new FormData();
    fd.set("name", "ช่างเอ");
    expect(parseStaffFormData(fd).isActive).toBe(false);
  });

  it.each(["off", "false", "0", "yes", "2", ""])(
    "treats %s as inactive",
    (value) => {
      const fd = new FormData();
      fd.set("name", "ช่างเอ");
      fd.set("isActive", value);
      expect(parseStaffFormData(fd).isActive).toBe(false);
    },
  );
});

describe("validateStaffForm", () => {
  it("returns no errors for a valid staff member", () => {
    const errors = validateStaffForm(validStaff());
    expect(errors).toEqual({});
    expect(hasStaffErrors(errors)).toBe(false);
  });

  it("requires name", () => {
    const errors = validateStaffForm(validStaff({ name: "" }));
    expect(errors.name).toBe("กรุณากรอกชื่อพนักงาน");
  });

  it("caps name at 120 characters", () => {
    const errors = validateStaffForm(validStaff({ name: "n".repeat(121) }));
    expect(errors.name).toBe("ชื่อพนักงานต้องไม่เกิน 120 ตัวอักษร");
  });

  it("caps nickname at 60 characters", () => {
    const errors = validateStaffForm(validStaff({ nickname: "x".repeat(61) }));
    expect(errors.nickname).toBe("ชื่อเล่นต้องไม่เกิน 60 ตัวอักษร");
  });

  it("accepts a nickname of exactly 60 characters", () => {
    const errors = validateStaffForm(validStaff({ nickname: "x".repeat(60) }));
    expect(errors.nickname).toBeUndefined();
  });

  it("caps role at 60 characters", () => {
    const errors = validateStaffForm(validStaff({ role: "r".repeat(61) }));
    expect(errors.role).toBe("ตำแหน่งต้องไม่เกิน 60 ตัวอักษร");
  });

  it("leaves phone unvalidated when absent", () => {
    const errors = validateStaffForm(validStaff({ phone: undefined }));
    expect(errors.phone).toBeUndefined();
  });

  it("accepts a valid phone", () => {
    const errors = validateStaffForm(validStaff({ phone: "0812345678" }));
    expect(errors.phone).toBeUndefined();
  });

  it("rejects an invalid phone when present", () => {
    const errors = validateStaffForm(validStaff({ phone: "123" }));
    expect(errors.phone).toBe("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)");
  });
});

describe("hasStaffErrors", () => {
  it("is false for an empty errors object", () => {
    expect(hasStaffErrors({})).toBe(false);
  });

  it("is true when at least one key is present", () => {
    expect(hasStaffErrors({ name: "กรุณากรอกชื่อพนักงาน" })).toBe(true);
  });
});

// ----- Service --------------------------------------------------------------

function validService(
  overrides: Partial<ServiceFormFields> = {},
): ServiceFormFields {
  return {
    name: "ตัดผมชาย",
    durationMinutes: "30",
    price: "150",
    description: undefined,
    isActive: true,
    ...overrides,
  };
}

describe("parseServiceFormData", () => {
  it("trims and nulls out empty description", () => {
    const fd = new FormData();
    fd.set("name", "  ตัดผม  ");
    fd.set("durationMinutes", "  30  ");
    fd.set("price", "  150  ");
    fd.set("description", "   ");
    fd.set("isActive", "1");

    const parsed = parseServiceFormData(fd);

    expect(parsed.name).toBe("ตัดผม");
    expect(parsed.durationMinutes).toBe("30");
    expect(parsed.price).toBe("150");
    expect(parsed.description).toBeUndefined();
    expect(parsed.isActive).toBe(true);
  });

  it.each(["on", "true", "1", "ON", "True"])(
    "treats %s as active",
    (value) => {
      const fd = new FormData();
      fd.set("name", "ตัดผม");
      fd.set("durationMinutes", "30");
      fd.set("isActive", value);
      expect(parseServiceFormData(fd).isActive).toBe(true);
    },
  );

  it("treats a missing isActive field as inactive", () => {
    const fd = new FormData();
    fd.set("name", "ตัดผม");
    fd.set("durationMinutes", "30");
    expect(parseServiceFormData(fd).isActive).toBe(false);
  });
});

describe("validateServiceForm", () => {
  it("returns no errors for a valid service", () => {
    const errors = validateServiceForm(validService());
    expect(errors).toEqual({});
    expect(hasServiceErrors(errors)).toBe(false);
  });

  it("returns no errors when price is omitted", () => {
    const errors = validateServiceForm(validService({ price: "" }));
    expect(errors).toEqual({});
  });

  it("requires name", () => {
    const errors = validateServiceForm(validService({ name: "" }));
    expect(errors.name).toBe("กรุณากรอกชื่อบริการ");
  });

  it("caps name at 120 characters", () => {
    const errors = validateServiceForm(validService({ name: "n".repeat(121) }));
    expect(errors.name).toBe("ชื่อบริการต้องไม่เกิน 120 ตัวอักษร");
  });

  it("requires durationMinutes", () => {
    const errors = validateServiceForm(validService({ durationMinutes: "" }));
    expect(errors.durationMinutes).toBe("กรุณากรอกระยะเวลา");
  });

  it("rejects a non-integer duration", () => {
    const errors = validateServiceForm(
      validService({ durationMinutes: "30.5" }),
    );
    expect(errors.durationMinutes).toBe("ระยะเวลาต้องเป็นจำนวนเต็ม (นาที)");
  });

  it("rejects a non-numeric duration", () => {
    const errors = validateServiceForm(
      validService({ durationMinutes: "abc" }),
    );
    expect(errors.durationMinutes).toBe("ระยะเวลาต้องเป็นจำนวนเต็ม (นาที)");
  });

  it("rejects a duration below the 10-minute floor", () => {
    const errors = validateServiceForm(validService({ durationMinutes: "5" }));
    expect(errors.durationMinutes).toBe("ระยะเวลาต้องอยู่ระหว่าง 10–480 นาที");
  });

  it("rejects a duration above the 480-minute ceiling", () => {
    const errors = validateServiceForm(validService({ durationMinutes: "500" }));
    expect(errors.durationMinutes).toBe("ระยะเวลาต้องอยู่ระหว่าง 10–480 นาที");
  });

  it("rejects an in-range duration that is not a multiple of 10", () => {
    const errors = validateServiceForm(validService({ durationMinutes: "15" }));
    expect(errors.durationMinutes).toBe(
      "ระยะเวลาต้องเป็นจำนวนเท่าของ 10 นาที",
    );
  });

  it("accepts the boundary durations 10 and 480", () => {
    expect(
      validateServiceForm(validService({ durationMinutes: "10" }))
        .durationMinutes,
    ).toBeUndefined();
    expect(
      validateServiceForm(validService({ durationMinutes: "480" }))
        .durationMinutes,
    ).toBeUndefined();
  });

  it("rejects a negative price", () => {
    const errors = validateServiceForm(validService({ price: "-1" }));
    expect(errors.price).toBe("ราคาต้องเป็นตัวเลขไม่ติดลบ");
  });

  it("rejects a non-numeric price", () => {
    const errors = validateServiceForm(validService({ price: "abc" }));
    expect(errors.price).toBe("ราคาต้องเป็นตัวเลขไม่ติดลบ");
  });

  it("rejects a price with more than 2 decimal places", () => {
    const errors = validateServiceForm(validService({ price: "1.005" }));
    expect(errors.price).toBe("ราคามีทศนิยมได้ไม่เกิน 2 ตำแหน่ง");
  });

  it("accepts a price with exactly 2 decimal places", () => {
    const errors = validateServiceForm(validService({ price: "1.50" }));
    expect(errors.price).toBeUndefined();
  });

  it("rejects a price above 1,000,000", () => {
    const errors = validateServiceForm(validService({ price: "1000001" }));
    expect(errors.price).toBe("ราคาสูงเกินไป");
  });

  it("accepts a price of exactly 1,000,000", () => {
    const errors = validateServiceForm(validService({ price: "1000000" }));
    expect(errors.price).toBeUndefined();
  });

  it("accepts a price of zero", () => {
    const errors = validateServiceForm(validService({ price: "0" }));
    expect(errors.price).toBeUndefined();
  });

  it("caps description at 500 characters", () => {
    const errors = validateServiceForm(
      validService({ description: "d".repeat(501) }),
    );
    expect(errors.description).toBe("รายละเอียดต้องไม่เกิน 500 ตัวอักษร");
  });
});

describe("hasServiceErrors", () => {
  it("is false for an empty errors object", () => {
    expect(hasServiceErrors({})).toBe(false);
  });

  it("is true when at least one key is present", () => {
    expect(hasServiceErrors({ name: "กรุณากรอกชื่อบริการ" })).toBe(true);
  });
});

// ----- Expense --------------------------------------------------------------

function validExpense(
  overrides: Partial<ExpenseFormFields> = {},
): ExpenseFormFields {
  return {
    category: "ค่าเช่าร้าน",
    amount: "1500",
    expenseDate: "2026-06-20",
    note: undefined,
    ...overrides,
  };
}

describe("validateExpenseForm", () => {
  it("returns no errors for a valid expense", () => {
    const errors = validateExpenseForm(validExpense());
    expect(errors).toEqual({});
    expect(hasExpenseErrors(errors)).toBe(false);
  });

  it("requires a category", () => {
    expect(validateExpenseForm(validExpense({ category: "" })).category).toBe(
      "กรุณาเลือกหรือระบุหมวดหมู่",
    );
  });

  it("caps category at 80 characters", () => {
    expect(
      validateExpenseForm(validExpense({ category: "x".repeat(81) })).category,
    ).toBe("หมวดหมู่ต้องไม่เกิน 80 ตัวอักษร");
  });

  it("requires an amount", () => {
    expect(validateExpenseForm(validExpense({ amount: "" })).amount).toBe(
      "กรุณากรอกจำนวนเงิน",
    );
  });

  it("rejects a zero or negative amount", () => {
    expect(validateExpenseForm(validExpense({ amount: "0" })).amount).toBe(
      "จำนวนเงินต้องเป็นตัวเลขมากกว่า 0",
    );
    expect(validateExpenseForm(validExpense({ amount: "-5" })).amount).toBe(
      "จำนวนเงินต้องเป็นตัวเลขมากกว่า 0",
    );
  });

  it("rejects an amount with more than 2 decimal places", () => {
    expect(validateExpenseForm(validExpense({ amount: "1.005" })).amount).toBe(
      "จำนวนเงินมีทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
    );
  });

  it("accepts an amount with exactly 2 decimal places", () => {
    expect(
      validateExpenseForm(validExpense({ amount: "1.50" })).amount,
    ).toBeUndefined();
  });

  it("requires a date", () => {
    expect(
      validateExpenseForm(validExpense({ expenseDate: "" })).expenseDate,
    ).toBe("กรุณาเลือกวันที่");
  });

  it("rejects a malformed or impossible date", () => {
    expect(
      validateExpenseForm(validExpense({ expenseDate: "2026-6-1" })).expenseDate,
    ).toBe("วันที่ไม่ถูกต้อง");
    expect(
      validateExpenseForm(validExpense({ expenseDate: "2026-02-30" }))
        .expenseDate,
    ).toBe("วันที่ไม่ถูกต้อง");
  });

  it("caps note at 500 characters", () => {
    expect(
      validateExpenseForm(validExpense({ note: "n".repeat(501) })).note,
    ).toBe("หมายเหตุต้องไม่เกิน 500 ตัวอักษร");
  });
});

describe("parseExpenseFormData", () => {
  it("trims fields and collapses an empty note to undefined", () => {
    const fd = new FormData();
    fd.set("category", "  ค่าเช่าร้าน  ");
    fd.set("amount", "  1500  ");
    fd.set("expenseDate", "  2026-06-20  ");
    fd.set("note", "   ");

    const parsed = parseExpenseFormData(fd);

    expect(parsed.category).toBe("ค่าเช่าร้าน");
    expect(parsed.amount).toBe("1500");
    expect(parsed.expenseDate).toBe("2026-06-20");
    expect(parsed.note).toBeUndefined();
  });
});

describe("hasExpenseErrors", () => {
  it("is false for an empty errors object", () => {
    expect(hasExpenseErrors({})).toBe(false);
  });

  it("is true when at least one key is present", () => {
    expect(hasExpenseErrors({ amount: "กรุณากรอกจำนวนเงิน" })).toBe(true);
  });
});
