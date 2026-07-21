import { describe, expect, it } from "vitest";

import { jsonToProfileFields, profileToJson } from "./profile";

describe("jsonToProfileFields", () => {
  it("reads a flat label/value object", () => {
    expect(jsonToProfileFields({ "Full name": "Ada", Email: "ada@x.io" })).toEqual([
      { label: "Full name", value: "Ada" },
      { label: "Email", value: "ada@x.io" }
    ]);
  });

  it("reads an array of { label, value }", () => {
    expect(
      jsonToProfileFields([
        { label: "Phone", value: "123" },
        { label: "City", value: "Delhi" }
      ])
    ).toEqual([
      { label: "Phone", value: "123" },
      { label: "City", value: "Delhi" }
    ]);
  });

  it("flattens nested objects and primitive arrays", () => {
    expect(
      jsonToProfileFields({ address: { city: "Delhi", zip: 110001 }, skills: ["ts", "py"] })
    ).toEqual([
      { label: "address - city", value: "Delhi" },
      { label: "address - zip", value: "110001" },
      { label: "skills", value: "ts, py" }
    ]);
  });

  it("renders an array of objects as one readable row each (never [object Object])", () => {
    const fields = jsonToProfileFields({
      education: [
        { degree: "B.Tech", institution: "XYZ", year: 2024 },
        { degree: "M.Tech", institution: "ABC", year: 2026 }
      ]
    });
    expect(fields).toEqual([
      { label: "education 1", value: "degree: B.Tech; institution: XYZ; year: 2024" },
      { label: "education 2", value: "degree: M.Tech; institution: ABC; year: 2026" }
    ]);
    expect(JSON.stringify(fields)).not.toContain("[object Object]");
  });

  it("ignores non-object junk", () => {
    expect(jsonToProfileFields("nope")).toEqual([]);
    expect(jsonToProfileFields(42)).toEqual([]);
  });

  it("round-trips through profileToJson", () => {
    const fields = [
      { label: "Full name", value: "Ada" },
      { label: "Email", value: "ada@x.io" }
    ];
    expect(jsonToProfileFields(JSON.parse(profileToJson(fields)))).toEqual(fields);
  });
});
