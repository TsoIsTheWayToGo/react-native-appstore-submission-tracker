const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class PermissionsRule extends ValidationRule {
  constructor() {
    super('permissions', 'Validates app permissions and usage descriptions')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Check background modes
    if (plist.UIBackgroundModes) {
      const backgroundModes = plist.UIBackgroundModes
      const sensitiveBackgroundModes = ['background-processing', 'background-fetch']

      for (const mode of sensitiveBackgroundModes) {
        if (backgroundModes.includes(mode)) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.MEDIUM,
              `App uses sensitive background mode: ${mode}`,
              'Ensure this is essential for core functionality',
              'Provide clear justification for background processing in App Review notes'
            )
          )
        }
      }
    }

    return results
  }
}

module.exports = PermissionsRule
