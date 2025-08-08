import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test functions like `describe`, `it`, etc.
    environment: 'node', // Use Node.js environment for testing
    coverage: {
      include: ['src/**/*.{js,ts}'], // Include all JS and TS files in the src directory for coverage
      exclude: [
        'src/**/*.d.ts', // Exclude TypeScript declaration files
        'src/cli.ts', // Exclude CLI entry point
        'src/index.ts', // Exclude main entry point if it doesn't contain testable code
        'src/utils/*.test.ts', // Exclude test files from coverage
      ],
      provider: 'v8', // Use v8 for coverage reporting
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportOnFailure: true, // Optional: Report coverage even if tests fail
      reportsDirectory: './tests/output/coverage', // Directory to output coverage reports
    },
  },
});