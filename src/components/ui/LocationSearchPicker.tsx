"use client";

import { useState } from "react";
import { LocationFieldCombobox } from "@/components/ui/LocationFieldCombobox";
import {
  districtsOf,
  subdistrictsOf,
  type LocationOption,
} from "@/lib/location/thailand";

/** A complete จังหวัด → เขต/อำเภอ → แขวง/ตำบล selection. */
export type LocationTriple = {
  province: string;
  district: string;
  subdistrict: string;
};

/**
 * Shop-form location entry as three independent type-ahead fields — ตำบล,
 * อำเภอ, จังหวัด. Searching any field and picking a suggestion fills the others
 * from the chosen row:
 *
 * - ตำบล / อำเภอ suggestions are full ตำบล→อำเภอ→จังหวัด rows, so a pick fills
 *   all three fields.
 * - จังหวัด suggestions are province-only, so a pick fills just จังหวัด and
 *   drops any อำเภอ/ตำบล that no longer belong under the new province.
 *
 * The values submit via hidden `province`/`district`/`subdistrict` inputs, so
 * this drops into an uncontrolled `<form action={…}>` like any other field. It
 * is the single location picker for all three shop forms (registration,
 * owner-edit, admin-edit); `validateShopForm` stays the authoritative
 * server-side check.
 *
 * SRP: own the authoritative {province, district, subdistrict} triple and
 * reconcile each field's pick/clear into it. The leaves
 * ({@link LocationFieldCombobox}) own search + display only — composition over
 * flags (DIP).
 */
export function LocationSearchPicker({
  defaultProvince = "",
  defaultDistrict = "",
  defaultSubdistrict = "",
  provinceError,
  districtError,
  subdistrictError,
  disabled = false,
  required = false,
}: {
  defaultProvince?: string;
  defaultDistrict?: string;
  defaultSubdistrict?: string;
  provinceError?: string;
  districtError?: string;
  subdistrictError?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState<LocationTriple>({
    province: defaultProvince,
    district: defaultDistrict,
    subdistrict: defaultSubdistrict,
  });

  // A pick carries as much of the hierarchy as its level knows: ตำบล/อำเภอ rows
  // bring the whole triple; จังหวัด rows bring only the province, so we keep the
  // existing อำเภอ/ตำบล only while they still belong under the new province.
  function handlePick(opt: LocationOption) {
    const province = opt.province;
    if (opt.district) {
      setValue({
        province,
        district: opt.district,
        subdistrict: opt.subdistrict ?? "",
      });
      return;
    }
    setValue((prev) => {
      const district = districtsOf(province).includes(prev.district)
        ? prev.district
        : "";
      const subdistrict =
        district &&
        subdistrictsOf(province, district).includes(prev.subdistrict)
          ? prev.subdistrict
          : "";
      return { province, district, subdistrict };
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <LocationFieldCombobox
          level="subdistrict"
          value={value.subdistrict}
          onPick={handlePick}
          onClear={() => setValue((p) => ({ ...p, subdistrict: "" }))}
          label="แขวง / ตำบล"
          placeholder="ค้นหาตำบล"
          errorText={subdistrictError}
          disabled={disabled}
          required={required}
        />
        <LocationFieldCombobox
          level="district"
          value={value.district}
          onPick={handlePick}
          onClear={() =>
            setValue((p) => ({ ...p, district: "", subdistrict: "" }))
          }
          label="เขต / อำเภอ"
          placeholder="ค้นหาอำเภอ"
          errorText={districtError}
          disabled={disabled}
          required={required}
        />
        <LocationFieldCombobox
          level="province"
          value={value.province}
          onPick={handlePick}
          onClear={() =>
            setValue({ province: "", district: "", subdistrict: "" })
          }
          label="จังหวัด"
          placeholder="ค้นหาจังหวัด"
          errorText={provinceError}
          disabled={disabled}
          required={required}
        />
      </div>
      <p className="text-label-sm text-on-surface-variant ml-1">
        พิมพ์ค้นหาช่องไหนก็ได้ — เลือกตำบลหรืออำเภอแล้วระบบจะเติมช่องที่เหลือให้อัตโนมัติ
      </p>
      <input type="hidden" name="province" value={value.province} />
      <input type="hidden" name="district" value={value.district} />
      <input type="hidden" name="subdistrict" value={value.subdistrict} />
    </div>
  );
}
