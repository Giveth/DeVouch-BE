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

  project.totalVouches = vouchCount;
  project.totalFlags = flagCount;

  await ctx.store.upsert(project);
};

export const getProject = async (
  ctx: DataHandlerContext<Store>,
  source: string,
  projectId: string
): Promise<Project> => {
  const id = `${source.toLocaleLowerCase()}-${projectId}`;

  let project: Project | undefined = await ctx.store.get(Project, id);

  if (!project) {
    await ctx.store.upsert(
      new Project({
        id,
        source: source.toLocaleLowerCase(),
        projectId,
        totalVouches: 0,
        totalFlags: 0,
        lastUpdatedTimestamp: new Date(),
      })
    );
    project = await ctx.store.findOneBy(Project, { id });
  }

  return project as Project;
};
