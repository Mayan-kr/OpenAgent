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

  it("flattens nested objects and arrays", () => {
    expect(
      jsonToProfileFields({ address: { city: "Delhi", zip: 110001 }, skills: ["ts", "py"] })
    ).toEqual([
      { label: "address - city", value: "Delhi" },
      { label: "address - zip", value: "110001" },
      { label: "skills", value: "ts, py" }
    ]);
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
