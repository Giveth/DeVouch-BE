/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // tests pat
  preset: "ts-jest",
  testEnvironment: "node",
  // setupFiles: ["./src/test/bootstrap.ts"],
  testMatch: [
    "<rootDir>/src/test/*.test.ts",
    "<rootDir>/src/controllers/utils/*.test.ts",
  ],
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
