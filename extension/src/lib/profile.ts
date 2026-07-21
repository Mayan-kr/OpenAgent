import type { ProfileField } from "../types";

const LABEL_MAX = 100;
const VALUE_MAX = 2_000;
const FIELD_MAX = 50;

// Turn an arbitrary JSON value into profile rows. Accepts the two shapes people actually
// keep profiles in - a flat { label: value } object, or an array of { label, value } - and
// flattens nested objects into "Parent - Child" labels and arrays into comma lists.
export function jsonToProfileFields(data: unknown): ProfileField[] {
  const out: ProfileField[] = [];

  const add = (label: string, value: string) => {
    const trimmed = label.trim().slice(0, LABEL_MAX);
    if (trimmed && out.length < FIELD_MAX)
      out.push({ label: trimmed, value: value.slice(0, VALUE_MAX) });
  };

  const walk = (label: string, value: unknown) => {
    if (out.length >= FIELD_MAX || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      add(
        label,
        value.map((item) => (item === null || item === undefined ? "" : String(item))).join(", ")
      );
    } else if (typeof value === "object") {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        walk(label ? `${label} - ${key}` : key, nested);
      }
    } else {
      add(label, String(value));
    }
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (out.length >= FIELD_MAX) break;
      if (item && typeof item === "object" && "label" in (item as object)) {
        const record = item as Record<string, unknown>;
        add(
          String(record.label ?? ""),
          record.value === null || record.value === undefined ? "" : String(record.value)
        );
      } else if (item && typeof item === "object") {
        for (const [key, value] of Object.entries(item as Record<string, unknown>))
          walk(key, value);
      }
    }
  } else if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) walk(key, value);
  }

  return out;
}

// Serialize the profile back to a flat { label: value } object - the friendliest shape to
// hand-edit and the one jsonToProfileFields reads back cleanly.
export function profileToJson(profile: ProfileField[]): string {
  const object: Record<string, string> = {};
  for (const field of profile) {
    const label = field.label.trim();
    if (label) object[label] = field.value;
  }
  return JSON.stringify(object, null, 2);
}
