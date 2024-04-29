import { DataHandlerContext } from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { Project, ProjectAttestation } from "../../model";

export const updateProjectAttestationCounts = async (
  ctx: DataHandlerContext<Store>,
  project: Project
): Promise<void> => {
  const [vouchCount, flagCount] = await Promise.all([
    ctx.store.count(ProjectAttestation, {
      where: {
        project,
        vouchOrFlag: true,
        revoked: false,
      },
    }),
    ctx.store.count(ProjectAttestation, {
      where: {
        project,
        vouchOrFlag: false,
        revoked: false,
      },
    }),
  ]);

  console.log("vouchCount:", vouchCount);
  console.log("flagCount:", flagCount);

  project.totalVouches = vouchCount;
  project.totalFlags = flagCount;

  await ctx.store.upsert(project);
};
