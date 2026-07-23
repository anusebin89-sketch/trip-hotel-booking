module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['routes/**/*.js', 'middleware/**/*.js', 'database/db.js'],
};
