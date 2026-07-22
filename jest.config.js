module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/public/',
    '/coverage/'
  ],
  setupFilesAfterFramework: [],
  verbose: true,
  testTimeout: 10000
};
