import {
  SchemaEncoder,
  SchemaDecodedItem,
} from "@ethereum-attestation-service/eas-sdk";
import { parseAttestationData } from "./projectVerificationHelper";

// Guards the eas-sdk decode -> zod safeParse path, which is otherwise untested.
// A shape change in SchemaEncoder.decodeData surfaces as attestations silently
// failing validation and being dropped, not as an exception - so assert on the
// safeParse outcome, not just that nothing threw.
const PROJECT_VERIFY_SCHEMA =
  "bool vouch,string projectSource,string projectId,string comment";

const decode = (comment: string): SchemaDecodedItem[] => {
  const encoder = new SchemaEncoder(PROJECT_VERIFY_SCHEMA);
  const encoded = encoder.encodeData([
    { name: "vouch", value: true, type: "bool" },
    { name: "projectSource", value: "giveth", type: "string" },
    { name: "projectId", value: "42", type: "string" },
    { name: "comment", value: comment, type: "string" },
  ]);
  return encoder.decodeData(encoded);
};

describe("parseAttestationData", () => {
  it("accepts a real encoded attestation round-tripped through eas-sdk", () => {
    const result = parseAttestationData(decode("looks legit"));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      vouch: true,
      projectSource: "giveth",
      projectId: "42",
      comment: "looks legit",
    });
  });

  it("accepts an attestation with an empty comment", () => {
    const result = parseAttestationData(decode(""));

    expect(result.success).toBe(true);
    expect(result.data?.comment).toBe("");
  });

  it("rejects an attestation missing required fields", () => {
    const partial = decode("dropped").filter(
      (item) => item.name !== "projectId"
    );

    const result = parseAttestationData(partial);

    expect(result.success).toBe(false);
  });

  it("rejects an attestation whose vouch is not a boolean", () => {
    const wrongType = decode("dropped").map((item) =>
      item.name === "vouch"
        ? { ...item, value: { ...item.value, value: "yes" } }
        : item
    ) as SchemaDecodedItem[];

    const result = parseAttestationData(wrongType);

    expect(result.success).toBe(false);
  });
});
