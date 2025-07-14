#!/usr/bin/env node

const yargs = require('yargs');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Import the AppStoreValidator class directly
const AppStoreValidator = require('../src/validator');
const packageJson = require('../package.json');

function setupCLI() {
  return yargs
    .scriptName('rn-appstore-validator')
    .usage('$0 <command> [options]')
    .command(
      'validate <buildPath>',
      'Validate React Native build for App Store submission',
      (yargs) => {
        yargs
          .positional('buildPath', {
            describe: 'Path to .app bundle or .ipa file',
            type: 'string'
          })
          .option('metadata', {
            alias: 'm',
            describe: 'Path to metadata JSON file',
            type: 'string',
            normalize: true
          })
          .option('output', {
            alias: 'o',
            describe: 'Output format',
            choices: ['console', 'json', 'junit'],
            default: 'console'
          })
          .option('verbose', {
            alias: 'v',
            describe: 'Verbose output',
            type: 'boolean',
            default: false
          })
          .option('rules', {
            alias: 'r',
            describe: 'Comma-separated list of rules to run (default: all)',
            type: 'string'
          })
          .option('ignore', {
            alias: 'i',
            describe: 'Comma-separated list of rules to ignore',
            type: 'string'
          })
          .option('fail-on', {
            describe: 'Severity level to fail on',
            choices: ['critical', 'high', 'medium', 'low'],
            default: 'high'
          })
          .option('output-file', {
            describe: 'Write output to file instead of stdout',
            type: 'string',
            normalize: true
          })
          .option('config', {
            alias: 'c',
            describe: 'Custom configuration file',
            type: 'string',
            normalize: true
          })
          .example('$0 validate ./ios/build/MyApp.app', 'Validate an app bundle')
          .example(
            '$0 validate ./MyApp.ipa --metadata ./metadata.json',
            'Validate IPA with metadata'
          )
          .example(
            '$0 validate ./MyApp.ipa --ignore code-signing,assets',
            'Skip specific validation rules'
          );
      },
      async (argv) => {
        await runValidation(argv);
      }
    )
    .command(
      'rules',
      'List available validation rules',
      () => {},
      () => {
        listRules();
      }
    )
    .command(
      'init',
      'Initialize configuration file',
      (yargs) => {
        yargs.option('force', {
          describe: 'Overwrite existing configuration',
          type: 'boolean',
          default: false
        });
      },
      (argv) => {
        initConfig(argv.force);
      }
    )
    .demandCommand(1, chalk.red('You must specify a command'))
    .strict()
    .wrap(Math.min(120, yargs.terminalWidth()));
}

async function runValidation(argv) {
  const startTime = Date.now();

  try {
    console.log(chalk.blue.bold('🍎 React Native App Store Submission Tracker'));
    console.log(chalk.gray(`Version ${packageJson.version}\n`));

    if (argv.verbose) {
      console.log(chalk.gray(`Build Path: ${argv.buildPath}`));
      console.log(chalk.gray(`Metadata: ${argv.metadata || 'Not provided'}`));
      console.log(chalk.gray(`Output Format: ${argv.output}`));
      console.log('');
    }

    // Parse CLI options into validator options
    const validatorOptions = {
      verbose: argv.verbose,
      output: argv.output,
      failOn: argv.failOn,
      configPath: argv.config
    };

    // Handle ignore rules
    if (argv.ignore) {
      validatorOptions.ignoreRules = argv.ignore.split(',').map((r) => r.trim());
    }

    // Handle specific rules
    if (argv.rules) {
      const enabledRules = argv.rules.split(',').map((r) => r.trim());
      validatorOptions.enabledRules = enabledRules;
    }

    // Create validator instance
    const validator = new AppStoreValidator(validatorOptions);

    // Run validation
    const report = await validator.validate(argv.buildPath, argv.metadata);

    // Output results
    if (argv.outputFile) {
      fs.writeFileSync(argv.outputFile, report);
      console.log(chalk.green(`Results written to ${argv.outputFile}`));
    } else {
      console.log(report);
    }

    // Show timing if verbose
    if (argv.verbose) {
      const duration = Date.now() - startTime;
      console.log(chalk.gray(`\nValidation completed in ${duration}ms`));
    }

    // Exit with appropriate code
    const shouldFail = validator.shouldFail(argv.failOn);
    process.exit(shouldFail ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\n💥 Validation failed:'));
    console.error(chalk.red(error.message));

    if (argv.verbose) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    console.error(chalk.gray('\nPlease report this issue at:'));
    console.error(
      chalk.blue('https://github.com/yourusername/react-native-appstore-submission-tracker/issues')
    );
    process.exit(1);
  }
}

function listRules() {
  console.log(chalk.blue.bold('📋 Available Validation Rules:\n'));

  const rules = [
    {
      name: 'info-plist-validation',
      description: 'Validates Info.plist configuration and required keys'
    },
    {
      name: 'privacy-compliance',
      description: 'Validates privacy manifests and permission descriptions'
    },
    { name: 'account-deletion', description: 'Validates account deletion requirements' },
    { name: 'permissions', description: 'Validates app permissions and usage descriptions' },
    { name: 'assets', description: 'Validates app icons and required assets' },
    { name: 'code-signing', description: 'Validates code signing and provisioning profiles' },
    { name: 'localization', description: 'Validates localization and internationalization' },
    { name: 'performance', description: 'Validates performance-related configurations' },
    { name: 'content-policy', description: 'Validates content policy compliance' },
    { name: 'metadata', description: 'Validates App Store metadata requirements' }
  ];

  rules.forEach((rule) => {
    console.log(`${chalk.blue('•')} ${chalk.bold(rule.name)}`);
    console.log(`  ${rule.description}\n`);
  });

  console.log(chalk.gray('Use --rules to run specific rules or --ignore to skip rules'));
  console.log(chalk.gray('Example: --ignore "code-signing,assets"'));
}

function initConfig(force) {
  const configPath = path.join(process.cwd(), 'appstore-validator.config.js');

  if (fs.existsSync(configPath) && !force) {
    console.log(
      chalk.yellow(`Configuration file already exists at ${configPath}. Use --force to overwrite.`)
    );
    return;
  }

  const configTemplate = `module.exports = {
  // Rule configuration
  rules: {
    'info-plist-validation': 'error',
    'privacy-compliance': 'error',
    'account-deletion': 'warn', 
    'permissions': 'warn',
    'assets': 'error',
    'code-signing': 'warn',
    'localization': 'info',
    'performance': 'warn',
    'content-policy': 'warn',
    'metadata': 'info'
  },

  // Rules to ignore completely
  ignore: [
    // 'code-signing'  // Uncomment to skip code signing checks
  ],

  // Fail threshold
  failOn: 'high' // critical, high, medium, low
};
`;

  fs.writeFileSync(configPath, configTemplate);
  console.log(chalk.green(`✅ Configuration file created at ${configPath}`));
  console.log(chalk.gray('Edit the file to customize validation settings'));
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error occurred:'));
  console.error(chalk.red(error.message));
  console.error(chalk.gray('\nPlease report this issue at:'));
  console.error(
    chalk.blue('https://github.com/yourusername/react-native-appstore-submission-tracker/issues')
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'));
  console.error(chalk.red(reason));
  console.error(chalk.gray('\nPlease report this issue at:'));
  console.error(
    chalk.blue('https://github.com/yourusername/react-native-appstore-submission-tracker/issues')
  );
  process.exit(1);
});

// Run CLI if this file is executed directly
if (require.main === module) {
  setupCLI().parse();
}

module.exports = { setupCLI };
