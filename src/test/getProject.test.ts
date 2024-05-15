import { describe, expect, test, afterAll } from "@jest/globals";
import { closeConnection, getTestCtx, getTestEntityManager } from "./utils";
import { getProject } from "../controllers/utils/modelHelper";
import { Project } from "../model";

describe("get project", () => {
  afterAll(async () => {
    await closeConnection();
  });

  beforeEach(async () => {
    const em = await getTestEntityManager();
    await em.delete(Project, {});
  });

  test("handles non-existent projects", async () => {
    const ctx = await getTestCtx();
    const id = "giveth-1";
    const project = await getProject(ctx, "giveth", "1");
    expect(project).toBeDefined();
    expect(project?.id).toBe(id);
  });

  test("fetches an existing project", async () => {
    const ctx = await getTestCtx();
    const id = "giveth-1";
    // create a project manually
    await getProject(ctx, "giveth", "1");
    let _project: Project | undefined = await ctx.store.get(Project, id);
    const project = await getProject(ctx, "giveth", "1");

    expect(_project).toBeDefined();
    expect(project).toBeDefined();
    expect(project?.id).toBe(_project?.id);
  });
});
