const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class CodeSigningRule extends ValidationRule {
  constructor() {
    super('code-signing', 'Validates code signing and provisioning profiles')
  }

  async validate(validator) {
    const results = []
    const buildPath = validator.getBuildPath()
    const context = this.detectBuildContext(buildPath)

    // Skip code signing checks in certain contexts
    if (this.shouldSkipCodeSigningCheck(context)) {
      return [
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Code signing verification skipped',
          context.reason,
          context.suggestion,
          'manual'
        )
      ]
    }

    try {
      const signatureResult = this.verifyCodeSignature(buildPath)
      if (signatureResult) {
        results.push(signatureResult)
      }
    } catch (error) {
      // Handle errors gracefully based on context
      const errorResult = this.handleCodeSigningError(error, context)
      if (errorResult) {
        results.push(errorResult)
      }
    }

    return results
  }

  detectBuildContext(buildPath) {
    const context = {
      platform: process.platform,
      buildType: 'unknown',
      hasFastlane: false,
      isCI: false,
      reason: '',
      suggestion: ''
    }

    // Detect platform
    if (context.platform !== 'darwin') {
      context.reason = 'Code signing verification only available on macOS'
      context.suggestion = 'Run validation on macOS for complete code signing verification'
      return context
    }

    // Detect CI environment
    context.isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI)

    // Detect Fastlane usage
    const projectRoot = this.findProjectRoot(buildPath)
    if (projectRoot) {
      const fastlanePath = path.join(projectRoot, 'ios', 'fastlane')
      context.hasFastlane = fs.existsSync(fastlanePath)

      if (context.hasFastlane) {
        context.reason = 'Fastlane detected - code signing managed automatically'
        context.suggestion = 'Verify Fastlane configuration and successful builds'
      }
    }

    // Detect build type
    if (buildPath.includes('Debug') || buildPath.includes('debug')) {
      context.buildType = 'debug'
      context.reason = 'Debug build detected - code signing verification not critical'
      context.suggestion = 'Code signing is more important for Release/App Store builds'
    } else if (buildPath.includes('Release') || buildPath.includes('release')) {
      context.buildType = 'release'
    }

    return context
  }

  shouldSkipCodeSigningCheck(context) {
    // Skip on non-macOS platforms
    if (context.platform !== 'darwin') {
      return true
    }

    // Skip for debug builds
    if (context.buildType === 'debug') {
      return true
    }

    // Skip when Fastlane is detected (unless explicitly requested)
    if (context.hasFastlane) {
      return true
    }

    return false
  }

  verifyCodeSignature(buildPath) {
    // Use different verification approaches based on file type
    let command
    if (buildPath.endsWith('.ipa')) {
      // For IPA files, we need to extract first or use specialized tools
      command = `codesign --verify --deep --strict "${buildPath}"`
    } else {
      // For .app bundles
      command = `codesign --verify --verbose=4 "${buildPath}"`
    }

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 10000 // 10 second timeout
    })

    // Check for specific issues in output
    if (result.includes('invalid')) {
      return new ValidationResult(
        this.name,
        SEVERITY.CRITICAL,
        'Invalid code signature detected',
        result.trim(),
        'Re-sign the app with valid certificates and provisioning profiles'
      )
    }

    // Successful verification
    return null
  }

  handleCodeSigningError(error, context) {
    const errorMessage = error.message || error.toString()

    // Handle specific known errors
    if (errorMessage.includes('code object is not signed at all')) {
      if (context.hasFastlane) {
        return new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Build appears unsigned, but Fastlane detected',
          'Fastlane typically handles code signing during distribution',
          'Verify your Fastlane configuration includes proper match/code signing steps'
        )
      }

      return new ValidationResult(
        this.name,
        SEVERITY.HIGH,
        'Build is not code signed',
        'Code signing is required for App Store distribution',
        'Configure code signing in Xcode or use Fastlane match for automatic signing'
      )
    }

    if (errorMessage.includes('No such file or directory')) {
      return new ValidationResult(
        this.name,
        SEVERITY.MEDIUM,
        'Could not verify code signature - file access issue',
        errorMessage,
        'Ensure the build path is correct and accessible'
      )
    }

    // Generic error handling
    return new ValidationResult(
      this.name,
      SEVERITY.LOW,
      'Could not verify code signature',
      errorMessage,
      'Manually verify code signing configuration in Xcode'
    )
  }

  findProjectRoot(buildPath) {
    let currentDir = path.dirname(buildPath)

    // Look up the directory tree for common React Native project indicators
    while (currentDir !== path.dirname(currentDir)) {
      if (
        fs.existsSync(path.join(currentDir, 'package.json')) &&
        fs.existsSync(path.join(currentDir, 'ios'))
      ) {
        return currentDir
      }
      currentDir = path.dirname(currentDir)
    }

    return null
  }
}

module.exports = CodeSigningRule
