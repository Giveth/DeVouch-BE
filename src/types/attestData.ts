import { SchemaDecodedItem } from "@ethereum-attestation-service/eas-sdk";

export type AttestData = {
  uid: string;
  schema: string;
  attester: string;

  data: SchemaDecodedItem[];
};
