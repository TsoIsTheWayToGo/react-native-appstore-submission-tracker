#!/usr/bin/env node

/**
 * CLI entry point for react-native-appstore-submission-tracker
 */

const path = require("path");

require.main.paths.unshift(path.join(__dirname, "..", "src"));

require("../src/cli.js");
