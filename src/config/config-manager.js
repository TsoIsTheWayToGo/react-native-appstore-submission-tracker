// src/config/config-manager.js

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

class ConfigManager {
  constructor() {
    this.defaultConfig = {
      rules: {
        'info-plist-validation': 'error',
        'privacy-compliance': 'error',
        'account-deletion': 'error',
        permissions: 'warn',
        assets: 'error',
        'code-signing': 'warn',
        localization: 'info',
        performance: 'warn',
        'content-policy': 'warn',
        metadata: 'info'
      },
      ignore: [],
      context: {
        buildType: 'auto-detect', // 'development', 'staging', 'production', 'auto-detect'
        existingAppStore: false,
        usesFastlane: 'auto-detect',
        platform: process.platform
      },
      output: {
        format: 'console',
        verbose: false,
        colors: true,
        showInfoIssues: true,
        groupBySeverity: true
      },
      failOn: 'high',
      customRules: []
    }
  }

  loadConfig(configPath) {
    let userConfig = {}

    // Try to load user config file
    if (configPath) {
      userConfig = this.loadConfigFile(configPath)
    } else {
      // Look for config in common locations
      const commonPaths = [
        'validator.config.js',
        '.validator.config.js',
        'appstore-validator.config.js'
      ]

      for (const configFile of commonPaths) {
        if (fs.existsSync(configFile)) {
          userConfig = this.loadConfigFile(configFile)
          console.log(chalk.gray(`Using config file: ${configFile}`))
          break
        }
      }
    }

    // Merge with defaults
    return this.mergeConfig(this.defaultConfig, userConfig)
  }

  loadConfigFile(configPath) {
    try {
      delete require.cache[path.resolve(configPath)]
      return require(path.resolve(configPath))
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not load config file ${configPath}: ${error.message}`)
      )
      return {}
    }
  }

  mergeConfig(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig))

    // Deep merge rules
    if (userConfig.rules) {
      Object.assign(merged.rules, userConfig.rules)
    }

    // Merge arrays
    if (userConfig.ignore) {
      merged.ignore = [...merged.ignore, ...userConfig.ignore]
    }

    if (userConfig.customRules) {
      merged.customRules = [...merged.customRules, ...userConfig.customRules]
    }

    // Merge objects
    if (userConfig.context) {
      Object.assign(merged.context, userConfig.context)
    }

    if (userConfig.output) {
      Object.assign(merged.output, userConfig.output)
    }

    // Direct overwrites
    if (userConfig.failOn) {
      merged.failOn = userConfig.failOn
    }

    return merged
  }

  createDefaultConfig(outputPath = 'validator.config.js', force = false) {
    if (fs.existsSync(outputPath) && !force) {
      console.log(
        chalk.yellow(`Config file already exists at ${outputPath}. Use --force to overwrite.`)
      )
      return false
    }

    const configTemplate = `module.exports = {
  // Rule configuration - 'error', 'warn', 'info', 'off'
  rules: {
    'info-plist-validation': 'error',
    'privacy-compliance': 'error',
    'account-deletion': 'error',
    'permissions': 'warn',
    'assets': 'error',
    'code-signing': 'warn',
    'localization': 'info',
    'performance': 'warn',
    'content-policy': 'warn',
    'metadata': 'info'
  },

  // Rules to completely ignore
  ignore: [
    // 'code-signing', // Uncomment to skip code signing checks
    // 'assets'       // Uncomment to skip asset checks
  ],

  // Context information for smarter validation
  context: {
    // Build type affects validation strictness
    buildType: 'auto-detect', // 'development', 'staging', 'production', 'auto-detect'
    
    // If your app is already in the App Store
    existingAppStore: false,
    
    // If you use Fastlane for builds/deployment
    usesFastlane: 'auto-detect', // true, false, 'auto-detect'
  },

  // Output configuration
  output: {
    format: 'console',     // 'console', 'json', 'junit'
    verbose: false,
    colors: true,
    showInfoIssues: true,
    groupBySeverity: true
  },

  // Minimum severity level to fail CI/validation
  failOn: 'high', // 'critical', 'high', 'medium', 'low'

  // Custom validation rules (paths to JS files)
  customRules: [
    // './custom-rules/company-branding-rule.js'
  ]
};`

    try {
      fs.writeFileSync(outputPath, configTemplate)
      console.log(chalk.green(`✅ Configuration file created at ${outputPath}`))
      console.log(chalk.gray('Edit the file to customize validation settings'))
      return true
    } catch (error) {
      console.error(chalk.red(`Failed to create config file: ${error.message}`))
      return false
    }
  }

  // Validate and process rule configuration
  processRuleConfig(ruleName, ruleConfig, context) {
    if (typeof ruleConfig === 'string') {
      return {
        level: ruleConfig,
        enabled: ruleConfig !== 'off'
      }
    }

    if (typeof ruleConfig === 'object') {
      const processed = {
        level: ruleConfig.level || 'error',
        enabled: ruleConfig.level !== 'off',
        ...ruleConfig
      }

      // Apply context-specific overrides
      if (context.existingAppStore && ruleConfig.skipForExistingApps) {
        processed.enabled = false
      }

      if (context.usesFastlane && ruleConfig.skipForFastlane) {
        processed.enabled = false
      }

      return processed
    }

    return {
      level: 'error',
      enabled: true
    }
  }
}

module.exports = ConfigManager
