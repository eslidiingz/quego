/**
 * Before → after for the fields that actually changed (audit L6), so an admin
 * edit records e.g. the owner phone it replaced. Empty string and null count as
 * the same "no value". Pure — no I/O.
 */
export type FieldChange = { from: string | null; to: string | null };

export function diffFields<K extends string>(
  before: Record<K, string | null>,
  after: Record<K, string | null>,
): Partial<Record<K, FieldChange>> {
  const changes: Partial<Record<K, FieldChange>> = {};
  for (const key of Object.keys(after) as K[]) {
    const from = before[key] || null;
    const to = after[key] || null;
    if (from !== to) changes[key] = { from, to };
  }
  return changes;
}
