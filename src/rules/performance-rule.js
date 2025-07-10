const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class PerformanceRule extends ValidationRule {
  constructor() {
    super('performance', 'Validates performance-related configurations')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Check for performance settings
    if (plist.UIViewControllerBasedStatusBarAppearance === false) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.LOW,
          'Using deprecated status bar configuration',
          'UIViewControllerBasedStatusBarAppearance is set to false',
          'Use view controller-based status bar appearance'
        )
      )
    }

    return results
  }
}

module.exports = PerformanceRule
