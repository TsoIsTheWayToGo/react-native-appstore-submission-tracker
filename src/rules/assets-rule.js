const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class AssetsRule extends ValidationRule {
  constructor() {
    super('assets', 'Validates app icons and required assets')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Check for app icon
    if (!plist.CFBundleIconFiles && !plist.CFBundleIconName) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.CRITICAL,
          'No app icon configuration found',
          'App icon is required for App Store submission',
          'Add app icon to your project and configure in Info.plist'
        )
      )
    }

    // Check for launch screen
    if (!plist.UILaunchStoryboardName && !plist.UILaunchImages) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'No launch screen configuration found',
          'Launch screen is required for modern iOS apps',
          'Add LaunchScreen.storyboard or configure UILaunchImages'
        )
      )
    }

    return results
  }
}

module.exports = AssetsRule
