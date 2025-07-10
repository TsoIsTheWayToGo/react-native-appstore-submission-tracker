module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  verbose: true,
  // Setup files
  setupFilesAfterEnv: [],
  // Module paths
  moduleDirectories: ['node_modules', 'src'],
  // Transform
  transform: {},
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
