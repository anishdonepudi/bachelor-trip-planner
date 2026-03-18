import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/scripts", "<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  // Exclude scraping tests locally; they only run in CI
  ...(!process.env.CI && {
    testPathIgnorePatterns: ["/scripts/__tests__/scrape-"],
  }),
};

export default config;
