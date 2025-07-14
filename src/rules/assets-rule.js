const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class AssetsRule extends ValidationRule {
  constructor() {
    super('assets', 'Validates app icons and required assets')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // App icon reminder - changed from CRITICAL to INFO
    if (!plist.CFBundleIconFiles && !plist.CFBundleIconName) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'App icon configuration reminder',
          'Ensure your app has properly configured icons before App Store submission',
          'Verify app icon appears correctly on device and configure CFBundleIconName or CFBundleIconFiles in Info.plist if needed. Most React Native projects handle this automatically through Xcode project settings.',
          'manual'
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
