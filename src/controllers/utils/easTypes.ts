import { z } from "zod";

export const ProjectVerificationAttestation = z.object({
  vouchOrFlag: z.boolean(),
  projectSource: z.string(),
  projectId: z.string(),
  attestorGroup: z.array(z.string()),
  comment: z.string().optional(),
});

export type ProjectVerificationAttestation = z.infer<
  typeof ProjectVerificationAttestation
>;
