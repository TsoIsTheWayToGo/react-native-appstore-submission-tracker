const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')
const { execSync } = require('child_process')

class CodeSigningRule extends ValidationRule {
  constructor() {
    super('code-signing', 'Validates code signing and provisioning profiles')
  }

  async validate(validator) {
    const results = []
    const buildPath = validator.getBuildPath()

    try {
      // Check code signature (requires macOS with codesign tool)
      if (process.platform === 'darwin') {
        const result = execSync(`codesign --verify --verbose=4 "${buildPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        })

        if (result.includes('invalid')) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.CRITICAL,
              'Invalid code signature detected',
              result,
              'Re-sign the app with valid certificates'
            )
          )
        }
      }
    } catch (error) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.MEDIUM,
          'Could not verify code signature',
          error.message,
          'Manually verify code signing before submission'
        )
      )
    }

    return results
  }
}

module.exports = CodeSigningRule
