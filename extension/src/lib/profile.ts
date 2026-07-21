import type { ProfileField } from "../types";

const LABEL_MAX = 100;
const VALUE_MAX = 2_000;
const FIELD_MAX = 50;

// Collapse any JSON value into one readable line: primitives as-is, arrays comma-joined,
// objects as "key: value; key: value". Used for array elements so an array of objects never
// degrades to "[object Object]".
function compactValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(compactValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => {
        const rendered = compactValue(nested);
        return rendered ? `${key}: ${rendered}` : "";
      })
      .filter(Boolean)
      .join("; ");
  }
  return String(value);
}

// Turn an arbitrary JSON value into profile rows. Accepts the two shapes people actually
// keep profiles in - a flat { label: value } object, or an array of { label, value } - and
// flattens nested objects into "Parent - Child" labels. Arrays of primitives become a comma
// list; arrays of objects become one readable row per element ("education 1", "education 2").
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
      const hasObject = value.some((item) => item !== null && typeof item === "object");
      if (!hasObject) {
        add(label, value.map((item) => (item === null ? "" : String(item))).join(", "));
      } else {
        value.forEach((item, index) => {
          if (item !== null && item !== undefined) add(`${label} ${index + 1}`, compactValue(item));
        });
      }
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
