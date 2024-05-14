import { z } from "zod";

export const ProjectVerificationAttestation = z.object({
  vouch: z.boolean(),
  projectSource: z.string(),
  projectId: z.string(),
  comment: z.string().optional(),
});

export type ProjectVerificationAttestation = z.infer<
  typeof ProjectVerificationAttestation
>;

const nullableIntType = z
  .string()
  .nullable()
  .transform((val) => parseInt(val || "0"));

export const orgCountTuplesTypes = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return [];
    return (
      val
        // Split the string using a regex that targets commas only if they are outside the parentheses
        .slice(1, -1)
        // Split the string using a regex that targets commas only if they are outside the parentheses
        .split(/(?<=\)\"),(?=\"\()/)
        // Remove leading and trailing quotes
        .map((part) =>
          part
            // Remove leading and trailing quotes
            .trim()
            .replace(/^"/, "")
            .replace(/"$/, "")
            // Remove '(' from begining and ')' from the end
            .slice(1, -1)
            .split(",")
        )
    );
  });

export const ProjectStats = z.object({
  id: z.string(),
  pr_total_flags: nullableIntType,
  pr_total_vouches: nullableIntType,
  pr_total_attestations: nullableIntType,
  org_flags: orgCountTuplesTypes,
  org_vouches: orgCountTuplesTypes,
  uniq_orgs: z.array(z.string()),
});

export type ProjectStats = z.infer<typeof ProjectStats>;
