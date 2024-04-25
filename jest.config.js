/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // tests pat
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["dotenv/config", "./src/test/bootstrap.ts"],
  testMatch: ["<rootDir>/src/test/*.test.ts"],
  forceExit: true,
};
