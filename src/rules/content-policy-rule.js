const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class ContentPolicyRule extends ValidationRule {
  constructor() {
    super('content-policy', 'Validates content policy compliance')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Check for export compliance
    if (plist.ITSAppUsesNonExemptEncryption === undefined) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.MEDIUM,
          'Export compliance not declared',
          'ITSAppUsesNonExemptEncryption not set',
          'Declare export compliance status in Info.plist'
        )
      )
    }

    return results
  }
}

module.exports = ContentPolicyRule
