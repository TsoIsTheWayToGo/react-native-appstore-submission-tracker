#!/usr/bin/env node

/**
 * CLI entry point for react-native-appstore-submission-tracker
 */

const path = require('path');

require.main.paths.unshift(path.join(__dirname, '..', 'src'));

const { setupCLI } = require('../src/cli.js');

// Add error handlers for better debugging
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('\n💥 Unhandled promise rejection:');
  console.error(reason);
  process.exit(1);
});

// Actually run the CLI
setupCLI().parse();
