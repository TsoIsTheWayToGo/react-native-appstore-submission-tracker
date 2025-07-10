const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class LocalizationRule extends ValidationRule {
  constructor() {
    super('localization', 'Validates localization and internationalization')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Check for localization support
    if (plist.CFBundleLocalizations && plist.CFBundleLocalizations.length > 1) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          `App supports ${plist.CFBundleLocalizations.length} languages`,
          `Languages: ${plist.CFBundleLocalizations.join(', ')}`,
          'Ensure all localizations are complete and accurate'
        )
      )
    }

    return results
  }
}

module.exports = LocalizationRule
