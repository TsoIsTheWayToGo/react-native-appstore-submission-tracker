/**
 * Main validator class for App Store submission validation
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const { SEVERITY, ValidationResult } = require('./utils/constants')
const { FileParser } = require('./utils/file-parser')
const rules = require('./rules')
const reporters = require('./reporters')

class AppStoreValidator {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      output: 'console',
      configPath: null,
      ruleOptions: {},
      failOn: 'high',
      ...options
    }

    this.results = []
    this.rules = new Map()
    this.buildPath = null
    this.infoPlist = null
    this.metadata = null
    this.fileParser = new FileParser()

    this.loadConfiguration()
    this.loadRules()
  }

  loadConfiguration() {
    let config = {}

    // Load config file if specified or exists
    const configPath =
      this.options.configPath || path.join(process.cwd(), 'appstore-validator.config.js')

    if (fs.existsSync(configPath)) {
      try {
        config = require(configPath)
        this.log(`Loaded configuration from: ${configPath}`)
      } catch (error) {
        this.log(`Warning: Could not load config file: ${error.message}`)
      }
    }

    // Merge with options
    this.config = {
      rules: {},
      ignore: [],
      customRules: [],
      ...config,
      ...this.options
    }
  }

  loadRules() {
    // Load built-in rules
    const builtInRules = [
      new rules.InfoPlistValidationRule(),
      new rules.PrivacyComplianceRule(),
      new rules.AccountDeletionRule(),
      new rules.PermissionsRule(),
      new rules.AssetsRule(),
      new rules.CodeSigningRule(),
      new rules.LocalizationRule(),
      new rules.PerformanceRule(),
      new rules.ContentPolicyRule(),
      new rules.MetadataRule()
    ]

    // Register built-in rules
    for (const rule of builtInRules) {
      this.registerRule(rule)
    }

    // Load custom rules
    if (this.config.customRules) {
      for (const customRulePath of this.config.customRules) {
        try {
          const CustomRule = require(path.resolve(customRulePath))
          this.registerRule(new CustomRule())
          this.log(`Loaded custom rule: ${customRulePath}`)
        } catch (error) {
          this.log(`Warning: Could not load custom rule ${customRulePath}: ${error.message}`)
        }
      }
    }

    // Apply rule filtering
    this.applyRuleFiltering()
  }

  registerRule(rule) {
    this.rules.set(rule.name, rule)
  }

  applyRuleFiltering() {
    // Remove ignored rules
    if (this.config.ignore) {
      for (const ignoredRule of this.config.ignore) {
        this.rules.delete(ignoredRule)
      }
    }

    // Filter to included rules only
    if (this.options.ruleOptions.include) {
      const includedRules = new Map()
      for (const ruleName of this.options.ruleOptions.include) {
        if (this.rules.has(ruleName)) {
          includedRules.set(ruleName, this.rules.get(ruleName))
        }
      }
      this.rules = includedRules
    }

    // Remove excluded rules
    if (this.options.ruleOptions.exclude) {
      for (const excludedRule of this.options.ruleOptions.exclude) {
        this.rules.delete(excludedRule)
      }
    }
  }

  async validate(buildPath, metadataPath = null) {
    this.buildPath = buildPath
    this.results = []

    this.log(`Starting validation for: ${buildPath}`)
    this.log(`Active rules: ${Array.from(this.rules.keys()).join(', ')}`)

    // Validate inputs - throw errors for invalid inputs
    this.validateInputs()

    try {
      // Parse build artifacts
      await this.parseBuildArtifacts()

      // Load metadata if provided
      if (metadataPath) {
        await this.loadMetadata(metadataPath)
      }

      // Run all validation rules
      await this.runValidationRules()

      return this.generateReport()
    } catch (error) {
      this.addResult(
        new ValidationResult(
          'SYSTEM',
          SEVERITY.CRITICAL,
          `Validation failed: ${error.message}`,
          error.stack
        )
      )
      return this.generateReport()
    }
  }

  validateInputs() {
    if (!fs.existsSync(this.buildPath)) {
      throw new Error(`Build path does not exist: ${this.buildPath}`)
    }

    const stats = fs.statSync(this.buildPath)
    const isValidBuild =
      (stats.isDirectory() && this.buildPath.endsWith('.app')) ||
      (stats.isFile() && this.buildPath.endsWith('.ipa'))

    if (!isValidBuild) {
      throw new Error('Build path must be either a .app directory or .ipa file')
    }
  }

  async parseBuildArtifacts() {
    this.log('Parsing build artifacts...')

    try {
      if (this.buildPath.endsWith('.ipa')) {
        const artifacts = await this.fileParser.parseIPA(this.buildPath)
        this.infoPlist = artifacts.infoPlist
      } else if (this.buildPath.endsWith('.app')) {
        const artifacts = await this.fileParser.parseAppBundle(this.buildPath)
        this.infoPlist = artifacts.infoPlist
      }

      this.log('Successfully parsed build artifacts')
    } catch (error) {
      throw new Error(`Failed to parse build artifacts: ${error.message}`)
    }
  }

  async loadMetadata(metadataPath) {
    this.log(`Loading metadata from: ${metadataPath}`)

    try {
      if (!fs.existsSync(metadataPath)) {
        throw new Error(`Metadata file does not exist: ${metadataPath}`)
      }

      const metadataContent = fs.readFileSync(metadataPath, 'utf8')
      this.metadata = JSON.parse(metadataContent)
      this.log('Successfully loaded metadata')
    } catch (error) {
      this.addResult(
        new ValidationResult(
          'METADATA_LOADING',
          SEVERITY.MEDIUM,
          `Failed to load metadata: ${error.message}`,
          `Path: ${metadataPath}`
        )
      )
    }
  }

  async runValidationRules() {
    this.log(`Running ${this.rules.size} validation rules...`)

    for (const [name, rule] of this.rules) {
      this.log(`Running rule: ${name}`)

      try {
        const ruleResults = await rule.validate(this)
        this.results.push(...ruleResults)
        this.log(`Rule ${name} completed with ${ruleResults.length} results`)
      } catch (error) {
        this.addResult(
          new ValidationResult(
            name,
            SEVERITY.MEDIUM,
            `Rule execution failed: ${error.message}`,
            error.stack,
            'Check rule implementation or file a bug report'
          )
        )
      }
    }
  }

  addResult(result) {
    this.results.push(result)
    if (this.options.verbose) {
      const color = this.getSeverityColor(result.severity)
      this.log(`${color(result.severity)}: ${result.message}`)
    }
  }

  log(message) {
    if (this.options.verbose) {
      console.log(chalk.gray(`[${new Date().toISOString()}] ${message}`))
    }
  }

  generateReport() {
    const summary = this.generateSummary()

    switch (this.options.output) {
      case 'json':
        return reporters.generateJsonReport(this.results, summary)
      case 'junit':
        return reporters.generateJUnitReport(this.results, summary)
      default:
        return reporters.generateConsoleReport(this.results, summary)
    }
  }

  generateSummary() {
    return {
      total: this.results.length,
      critical: this.results.filter((r) => r.severity === SEVERITY.CRITICAL).length,
      high: this.results.filter((r) => r.severity === SEVERITY.HIGH).length,
      medium: this.results.filter((r) => r.severity === SEVERITY.MEDIUM).length,
      low: this.results.filter((r) => r.severity === SEVERITY.LOW).length,
      info: this.results.filter((r) => r.severity === SEVERITY.INFO).length,
      buildPath: this.buildPath,
      timestamp: new Date().toISOString(),
      rulesRun: Array.from(this.rules.keys())
    }
  }

  getSeverityColor(severity) {
    switch (severity) {
      case SEVERITY.CRITICAL:
        return chalk.red.bold
      case SEVERITY.HIGH:
        return chalk.redBright
      case SEVERITY.MEDIUM:
        return chalk.yellow
      case SEVERITY.LOW:
        return chalk.blue
      default:
        return chalk.gray
    }
  }

  // Getters for rule access
  getInfoPlist() {
    return this.infoPlist
  }

  getMetadata() {
    return this.metadata
  }

  getBuildPath() {
    return this.buildPath
  }

  getFileParser() {
    return this.fileParser
  }
}

module.exports = { AppStoreValidator }
