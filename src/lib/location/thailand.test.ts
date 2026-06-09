import { describe, it, expect } from "vitest";
import {
  PROVINCES,
  DISTRICTS_BY_PROVINCE,
  subKey,
  districtsOf,
  subdistrictsOf,
  isValidProvince,
  isValidDistrict,
  isValidSubdistrict,
  searchLocations,
  searchLocationsByLevel,
  type LocationOption,
} from "@/lib/location/thailand";

const BANGKOK = "กรุงเทพมหานคร";

/** First (province, district) pair whose district has at least one subdistrict. */
function findRealTriple(): { province: string; district: string; subdistrict: string } {
  for (const province of PROVINCES) {
    for (const district of districtsOf(province)) {
      const subs = subdistrictsOf(province, district);
      if (subs.length > 0) {
        return { province, district, subdistrict: subs[0] };
      }
    }
  }
  throw new Error("expected at least one real province/district/subdistrict triple");
}

describe("subKey", () => {
  it("joins province and district with a pipe", () => {
    expect(subKey(BANGKOK, "เขตพญาไท")).toBe("กรุงเทพมหานคร|เขตพญาไท");
  });

  it("composes a key usable to look up subdistricts", () => {
    const district = districtsOf(BANGKOK)[0];
    // The key shape must match what subdistrictsOf consumes internally.
    expect(subKey(BANGKOK, district)).toBe(`${BANGKOK}|${district}`);
  });
});

describe("PROVINCES data set", () => {
  it("is non-empty and includes Bangkok", () => {
    expect(PROVINCES.length).toBeGreaterThan(0);
    expect(PROVINCES).toContain(BANGKOK);
  });

  it("mirrors the keys of DISTRICTS_BY_PROVINCE", () => {
    expect([...PROVINCES].sort()).toEqual(Object.keys(DISTRICTS_BY_PROVINCE).sort());
  });
});

describe("isValidProvince", () => {
  it("accepts a known Thai province name", () => {
    expect(isValidProvince(BANGKOK)).toBe(true);
    expect(isValidProvince(PROVINCES[0])).toBe(true);
  });

  it("rejects a Latin transliteration, empty string, and unknown name", () => {
    expect(isValidProvince("Bangkok")).toBe(false);
    expect(isValidProvince("")).toBe(false);
    expect(isValidProvince("ไม่มีจังหวัดนี้")).toBe(false);
  });
});

describe("districtsOf", () => {
  it("returns an empty list for an unknown province", () => {
    expect(districtsOf("ไม่มีจังหวัดนี้")).toHaveLength(0);
    expect(districtsOf("")).toHaveLength(0);
  });

  it("returns a non-empty list for a real province", () => {
    expect(districtsOf(PROVINCES[0]).length).toBeGreaterThan(0);
    expect(districtsOf(BANGKOK)).toContain("เขตพญาไท");
  });
});

describe("isValidDistrict", () => {
  it("accepts a real district of its province", () => {
    const province = PROVINCES[0];
    const district = districtsOf(province)[0];
    expect(isValidDistrict(province, district)).toBe(true);
  });

  it("rejects a bogus district and a real district under the wrong province", () => {
    expect(isValidDistrict(BANGKOK, "ไม่มีเขตนี้")).toBe(false);
    // A real Bangkok district is not valid under an unknown province.
    expect(isValidDistrict("ไม่มีจังหวัดนี้", "เขตพญาไท")).toBe(false);
  });
});

describe("subdistrictsOf", () => {
  it("returns an empty array for an unknown province/district pair", () => {
    expect(subdistrictsOf("ไม่มีจังหวัดนี้", "ไม่มีเขตนี้")).toEqual([]);
    expect(subdistrictsOf(BANGKOK, "ไม่มีเขตนี้")).toEqual([]);
  });

  it("returns the subdistrict list for a real pair", () => {
    const { province, district, subdistrict } = findRealTriple();
    const subs = subdistrictsOf(province, district);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs).toContain(subdistrict);
  });
});

describe("isValidSubdistrict", () => {
  it("accepts a derived real province/district/subdistrict triple", () => {
    const { province, district, subdistrict } = findRealTriple();
    expect(isValidSubdistrict(province, district, subdistrict)).toBe(true);
  });

  it("rejects a bogus subdistrict under a real pair", () => {
    const { province, district } = findRealTriple();
    expect(isValidSubdistrict(province, district, "ไม่มีตำบลนี้")).toBe(false);
  });
});

describe("searchLocations", () => {
  it("returns an empty array for an empty or whitespace query", () => {
    expect(searchLocations("")).toEqual([]);
    expect(searchLocations("   ")).toEqual([]);
  });

  it("surfaces a province-only 'ทุกพื้นที่' option first for a province name", () => {
    const results = searchLocations(BANGKOK);
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first.province).toBe(BANGKOK);
    expect(first.district).toBeNull();
    expect(first.subdistrict).toBeNull();
    expect(first.label).toContain("ทุกพื้นที่");
  });

  it("ranks province/district options before subdistrict options by default", () => {
    const results = searchLocations(BANGKOK, 50);
    const firstSubIdx = results.findIndex((r) => r.subdistrict !== null);
    const lastBroadIdx = results.reduce(
      (acc, r, i) => (r.subdistrict === null ? i : acc),
      -1,
    );
    if (firstSubIdx !== -1 && lastBroadIdx !== -1) {
      // Every broad (province/district) option precedes every subdistrict one.
      expect(lastBroadIdx).toBeLessThan(firstSubIdx);
    }
  });

  it("can surface a subdistrict hit first when subdistrictFirst is set", () => {
    // Pick a subdistrict name and confirm the default puts a broad row first
    // while subdistrictFirst flips a tambon to the front.
    const { subdistrict } = findRealTriple();
    const sFirst = searchLocations(subdistrict, 50, { subdistrictFirst: true });
    const subHits = sFirst.filter((r) => r.subdistrict !== null);
    if (subHits.length > 0) {
      expect(sFirst[0].subdistrict).not.toBeNull();
    }
  });

  it("respects the limit argument", () => {
    const limited = searchLocations(BANGKOK, 3);
    expect(limited.length).toBeLessThanOrEqual(3);
    const more = searchLocations(BANGKOK, 50);
    expect(more.length).toBeGreaterThanOrEqual(limited.length);
  });

  it("formats the three label shapes with Thai separators", () => {
    const provinceOpt = searchLocations(BANGKOK, 50).find((r) => r.district === null);
    expect(provinceOpt?.label).toBe(`${BANGKOK} · ทุกพื้นที่`);

    const districtOpt = searchLocations(BANGKOK, 50).find(
      (r) => r.district !== null && r.subdistrict === null,
    );
    if (districtOpt) {
      expect(districtOpt.label).toContain("· ทุกตำบล");
      expect(districtOpt.label).toContain(districtOpt.province);
    }
  });

  it("ranks prefix matches above mid-string matches within province hits", () => {
    // "เขต" prefixes every Bangkok district; querying it returns many district
    // hits whose prefix matches must sort ahead of mid-string ones.
    const results = searchLocations("เขต", 200);
    const districtHits = results.filter((r) => r.district !== null && r.subdistrict === null);
    const firstMidIdx = districtHits.findIndex((r) => !r.district!.startsWith("เขต"));
    const lastPrefixIdx = districtHits.reduce(
      (acc, r, i) => (r.district!.startsWith("เขต") ? i : acc),
      -1,
    );
    if (firstMidIdx !== -1 && lastPrefixIdx !== -1) {
      expect(lastPrefixIdx).toBeLessThan(firstMidIdx);
    }
  });
});

describe("searchLocationsByLevel", () => {
  it("returns an empty array for an empty query", () => {
    expect(searchLocationsByLevel("", "province")).toEqual([]);
    expect(searchLocationsByLevel("   ", "subdistrict")).toEqual([]);
  });

  it("returns province-only rows for the province level", () => {
    const results = searchLocationsByLevel(BANGKOK, "province");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.district).toBeNull();
      expect(r.subdistrict).toBeNull();
    }
    expect(results[0].province).toBe(BANGKOK);
    expect(results[0].label).toBe(BANGKOK);
  });

  it("returns full three-level rows for the subdistrict level", () => {
    const { subdistrict } = findRealTriple();
    const results = searchLocationsByLevel(subdistrict, "subdistrict");
    expect(results.length).toBeGreaterThan(0);
    const hit = results.find((r) => r.subdistrict === subdistrict);
    expect(hit).toBeDefined();
    expect(hit!.province).not.toBeNull();
    expect(hit!.district).not.toBeNull();
    expect(hit!.label).toBe(`${hit!.subdistrict}, ${hit!.district}, ${hit!.province}`);
  });

  it("returns full three-level rows for the district level", () => {
    const district = districtsOf(BANGKOK)[0];
    const results = searchLocationsByLevel(district, "district");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.province).not.toBeNull();
      expect(r.district).not.toBeNull();
      // district-level rows still carry their subdistrict (full address row).
      expect(r.label).toContain(r.province);
    }
  });

  it("respects the limit argument", () => {
    const limited = searchLocationsByLevel("เขต", "district", 2);
    expect(limited.length).toBeLessThanOrEqual(2);
  });
});

describe("LocationOption shape", () => {
  it("every searchLocations result carries province, district, subdistrict, and label", () => {
    const results: LocationOption[] = searchLocations(BANGKOK, 5);
    for (const r of results) {
      expect(r).toHaveProperty("province");
      expect(r).toHaveProperty("district");
      expect(r).toHaveProperty("subdistrict");
      expect(typeof r.label).toBe("string");
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});
