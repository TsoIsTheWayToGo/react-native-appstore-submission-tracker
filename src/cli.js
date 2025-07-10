#!/usr/bin/env node

/**
 * CLI interface for react-native-appstore-submission-tracker
 */

const chalk = require('chalk')
const yargs = require('yargs')
const { AppStoreValidator } = require('./validator')
const { SEVERITY } = require('./utils/constants')
const packageJson = require('../package.json')

function setupCLI() {
  return yargs
    .scriptName('rn-appstore-validator')
    .usage('$0 <command> [options]')
    .version(packageJson.version)
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .command(
      'validate <buildPath>',
      'Validate React Native build for App Store submission',
      (yargs) => {
        yargs
          .positional('buildPath', {
            describe: 'Path to .app bundle or .ipa file',
            type: 'string',
            normalize: true
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
          .option('config', {
            alias: 'c',
            describe: 'Custom configuration file',
            type: 'string',
            normalize: true
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
          .example(
            '$0 validate ./ios/build/MyApp.app',
            'Validate an app bundle'
          )
          .example(
            '$0 validate ./MyApp.ipa --metadata ./metadata.json',
            'Validate IPA with metadata'
          )
          .example(
            '$0 validate ./MyApp.ipa --output json --output-file results.json',
            'Save JSON results to file'
          )
      },
      async(argv) => {
        await runValidation(argv)
      }
    )
    .command(
      'rules',
      'List available validation rules',
      () => {},
      () => {
        listRules()
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
        })
      },
      (argv) => {
        initConfig(argv.force)
      }
    )
    .demandCommand(1, chalk.red('You must specify a command'))
    .strict()
    .wrap(Math.min(120, yargs.terminalWidth()))
}

async function runValidation(argv) {
  const startTime = Date.now()

  try {
    console.log(
      chalk.blue.bold('🍎 React Native App Store Submission Tracker')
    )
    console.log(chalk.gray(`Version ${packageJson.version}\n`))

    if (argv.verbose) {
      console.log(chalk.gray(`Build Path: ${argv.buildPath}`))
      console.log(chalk.gray(`Metadata: ${argv.metadata || 'Not provided'}`))
      console.log(chalk.gray(`Output Format: ${argv.output}`))
      console.log('')
    }

    // Parse rule options
    const ruleOptions = {}
    if (argv.rules) {
      ruleOptions.include = argv.rules.split(',').map((r) => r.trim())
    }
    if (argv.ignore) {
      ruleOptions.exclude = argv.ignore.split(',').map((r) => r.trim())
    }

    const validator = new AppStoreValidator({
      verbose: argv.verbose,
      output: argv.output,
      configPath: argv.config,
      ruleOptions,
      failOn: argv.failOn
    })

    const report = await validator.validate(argv.buildPath, argv.metadata)

    // Output results
    if (argv.outputFile) {
      const fs = require('fs')
      fs.writeFileSync(argv.outputFile, report)
      console.log(chalk.green(`✅ Results written to ${argv.outputFile}`))
    } else {
      console.log(report)
    }

    // Performance info
    const duration = Date.now() - startTime
    if (argv.verbose) {
      console.log(chalk.gray(`\n⏱️  Validation completed in ${duration}ms`))
    }

    // Exit with appropriate code
    const failureThreshold = getSeverityLevel(argv.failOn)
    const hasFailures = validator.results.some(
      (r) => getSeverityLevel(r.severity) >= failureThreshold
    )

    if (hasFailures) {
      console.log(
        chalk.red('\n❌ Validation failed - issues found above threshold')
      )
      process.exit(1)
    } else {
      console.log(chalk.green('\n✅ Validation passed'))
      process.exit(0)
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Validation failed: ${error.message}`))

    if (argv.verbose) {
      console.error(chalk.gray(error.stack))
    } else {
      console.error(chalk.gray('Use --verbose for detailed error information'))
    }

    process.exit(1)
  }
}

function listRules() {
  console.log(chalk.blue.bold('📋 Available Validation Rules\n'))

  const rules = [
    {
      name: 'info-plist-validation',
      description: 'Validates Info.plist configuration and required keys',
      severity: 'Critical'
    },
    {
      name: 'privacy-compliance',
      description: 'Checks privacy manifests and permission descriptions',
      severity: 'High'
    },
    {
      name: 'account-deletion',
      description: 'Validates account deletion requirements',
      severity: 'High'
    },
    {
      name: 'permissions',
      description: 'Validates app permissions and usage descriptions',
      severity: 'Medium'
    },
    {
      name: 'assets',
      description: 'Checks app icons, launch screens, and required assets',
      severity: 'High'
    },
    {
      name: 'code-signing',
      description: 'Validates code signing and provisioning profiles',
      severity: 'Critical'
    },
    {
      name: 'localization',
      description: 'Checks localization and internationalization',
      severity: 'Low'
    },
    {
      name: 'performance',
      description: 'Validates performance-related configurations',
      severity: 'Low'
    },
    {
      name: 'content-policy',
      description: 'Checks content policy compliance',
      severity: 'Medium'
    },
    {
      name: 'metadata',
      description: 'Validates App Store metadata requirements',
      severity: 'Medium'
    }
  ]

  for (const rule of rules) {
    const severityColor = getSeverityColor(rule.severity.toUpperCase())
    console.log(
      `${chalk.bold(rule.name)} ${severityColor(`[${rule.severity}]`)}`
    )
    console.log(`  ${chalk.gray(rule.description)}\n`)
  }

  console.log(
    chalk.gray('Use --rules to run specific rules, --ignore to exclude rules')
  )
}

function initConfig(force = false) {
  const fs = require('fs')
  const path = require('path')

  const configPath = path.join(process.cwd(), 'appstore-validator.config.js')

  if (fs.existsSync(configPath) && !force) {
    console.log(
      chalk.yellow(
        '⚠️  Configuration file already exists. Use --force to overwrite.'
      )
    )
    return
  }

  const configTemplate = `module.exports = {
  // Rule configuration
  rules: {
    'info-plist-validation': 'error',
    'privacy-compliance': 'error',
    'account-deletion': 'warn',
    'permissions': 'warn',
    'assets': 'error',
    'code-signing': 'error',
    'localization': 'info',
    'performance': 'warn',
    'content-policy': 'warn',
    'metadata': 'warn'
  },

  // Rules to ignore completely
  ignore: [
    // 'localization'  // Example: skip localization checks
  ],

  // Custom rules (paths to JS files)
  customRules: [
    // './custom-rules/company-branding-rule.js'
  ],

  // Output configuration
  output: {
    format: 'console', // console, json, junit
    verbose: false,
    colors: true
  },

  // Fail threshold
  failOn: 'high' // critical, high, medium, low
};
`

  fs.writeFileSync(configPath, configTemplate)
  console.log(chalk.green(`✅ Configuration file created at ${configPath}`))
  console.log(chalk.gray('Edit the file to customize validation settings'))
}

function getSeverityLevel(severity) {
  const levels = {
    [SEVERITY.CRITICAL]: 4,
    [SEVERITY.HIGH]: 3,
    [SEVERITY.MEDIUM]: 2,
    [SEVERITY.LOW]: 1,
    [SEVERITY.INFO]: 0
  }
  return levels[severity.toUpperCase()] || 0
}

function getSeverityColor(severity) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return chalk.red.bold
    case 'HIGH':
      return chalk.redBright
    case 'MEDIUM':
      return chalk.yellow
    case 'LOW':
      return chalk.blue
    default:
      return chalk.gray
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error occurred:'))
  console.error(chalk.red(error.message))
  console.error(chalk.gray('\nPlease report this issue at:'))
  console.error(
    chalk.blue(
      'https://github.com/yourusername/react-native-appstore-submission-tracker/issues'
    )
  )
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'))
  console.error(chalk.red(reason))
  console.error(chalk.gray('\nPlease report this issue at:'))
  console.error(
    chalk.blue(
      'https://github.com/yourusername/react-native-appstore-submission-tracker/issues'
    )
  )
  process.exit(1)
})

// Run CLI if this file is executed directly
if (require.main === module) {
  setupCLI().parse()
}

module.exports = { setupCLI }
