/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // tests pat
  preset: "ts-jest",
  testEnvironment: "node",
  // sanitize-html's HTML parser and its helpers are published as ES modules
  // only. Node loads them with a plain require(), but Jest's own module loader
  // cannot do that before Node 24.9, so these packages are compiled to
  // CommonJS for the tests.
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "/node_modules/.+\\.js$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: { allowJs: true, module: "commonjs", target: "es2020" },
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:.*/)?(?:htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)",
  ],
  // setupFiles: ["./src/test/bootstrap.ts"],
  testMatch: [
    "<rootDir>/src/test/*.test.ts",
    "<rootDir>/src/controllers/utils/*.test.ts",
  ],
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
