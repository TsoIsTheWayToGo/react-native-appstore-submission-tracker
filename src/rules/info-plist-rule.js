/**
 * Info.plist validation rule
 */

const {
  ValidationRule,
  ValidationResult,
  SEVERITY,
  REQUIRED_PLIST_KEYS,
  IOS_SUPPORT
} = require('../utils/constants')

class InfoPlistValidationRule extends ValidationRule {
  constructor() {
    super(
      'info-plist-validation',
      'Validates Info.plist configuration and required keys'
    )
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) {
      return [
        new ValidationResult(
          this.name,
          SEVERITY.CRITICAL,
          'Info.plist not found or could not be parsed',
          'The Info.plist file is required for all iOS apps',
          'Ensure Info.plist exists in your app bundle and is valid XML'
        )
      ]
    }

    // Check required keys
    for (const requiredKey of REQUIRED_PLIST_KEYS) {
      if (!plist[requiredKey]) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.CRITICAL,
            `Missing required key: ${requiredKey}`,
            `Info.plist is missing the required ${requiredKey} key`,
            `Add ${requiredKey} to your Info.plist file`
          )
        )
      }
    }

    // Bundle identifier validation
    if (plist.CFBundleIdentifier) {
      if (!/^[a-zA-Z0-9.-]+$/.test(plist.CFBundleIdentifier)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Invalid bundle identifier format',
            `Bundle ID contains invalid characters: ${plist.CFBundleIdentifier}`,
            'Use reverse-DNS notation with only letters, numbers, dots, and hyphens'
          )
        )
      }

      if (plist.CFBundleIdentifier.length > 255) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Bundle identifier too long',
            `Bundle ID exceeds 255 characters: ${plist.CFBundleIdentifier.length}`,
            'Shorten your bundle identifier to 255 characters or less'
          )
        )
      }

      if (plist.CFBundleIdentifier.includes('..')) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Invalid bundle identifier format',
            'Bundle ID contains consecutive dots',
            'Remove consecutive dots from bundle identifier'
          )
        )
      }
    }

    // Version validation
    if (plist.CFBundleShortVersionString) {
      if (!/^\d+(\.\d+)*$/.test(plist.CFBundleShortVersionString)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Invalid marketing version format',
            `Version should follow semantic versioning: ${plist.CFBundleShortVersionString}`,
            'Use format like 1.0.0 or 2.1'
          )
        )
      }
    }

    if (plist.CFBundleVersion) {
      if (!/^\d+(\.\d+)*$/.test(plist.CFBundleVersion)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Invalid build number format',
            `Build number should be numeric: ${plist.CFBundleVersion}`,
            'Use numeric build numbers like 1, 42, or 1.0'
          )
        )
      }
    }

    // iOS version validation
    if (plist.MinimumOSVersion || plist.LSMinimumSystemVersion) {
      const minVersion = plist.MinimumOSVersion || plist.LSMinimumSystemVersion
      const minVersionFloat = parseFloat(minVersion)

      if (minVersionFloat < parseFloat(IOS_SUPPORT.MINIMUM_SUPPORTED)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            'Very low minimum iOS version',
            `Minimum iOS version ${minVersion} is below recommended ${IOS_SUPPORT.MINIMUM_SUPPORTED}`,
            `Consider raising minimum iOS version to ${IOS_SUPPORT.RECOMMENDED_MINIMUM} for better security and features`
          )
        )
      }

      if (minVersionFloat > parseFloat(IOS_SUPPORT.LATEST_SDK_REQUIRED)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Minimum iOS version too high',
            `Minimum iOS version ${minVersion} exceeds latest SDK ${IOS_SUPPORT.LATEST_SDK_REQUIRED}`,
            'Lower the minimum iOS version to a supported version'
          )
        )
      }
    }

    // App name validation
    if (plist.CFBundleDisplayName && plist.CFBundleDisplayName.length > 30) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'App display name too long',
          `Display name exceeds 30 characters: ${plist.CFBundleDisplayName.length}`,
          'Shorten the app display name to 30 characters or less'
        )
      )
    }

    // URL schemes validation
    if (plist.CFBundleURLTypes) {
      for (const urlType of plist.CFBundleURLTypes) {
        if (urlType.CFBundleURLSchemes) {
          for (const scheme of urlType.CFBundleURLSchemes) {
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(scheme)) {
              results.push(
                new ValidationResult(
                  this.name,
                  SEVERITY.MEDIUM,
                  'Invalid URL scheme format',
                  `URL scheme contains invalid characters: ${scheme}`,
                  'URL schemes must start with a letter and contain only letters, numbers, +, -, and .'
                )
              )
            }
          }
        }
      }
    }

    // Check for development-specific configurations
    if (plist.UIFileSharingEnabled === true) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.MEDIUM,
          'File sharing enabled',
          'UIFileSharingEnabled is set to true',
          'Consider if file sharing is necessary for production app'
        )
      )
    }

    // Check for debug configurations
    if (plist.DTXcode) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Development metadata present',
          'Info.plist contains development-time metadata',
          'This is normal for development builds'
        )
      )
    }

    // Validate required device capabilities
    if (plist.UIRequiredDeviceCapabilities) {
      const capabilities = plist.UIRequiredDeviceCapabilities
      const validCapabilities = [
        'accelerometer',
        'auto-focus-camera',
        'bluetooth-le',
        'camera-flash',
        'front-facing-camera',
        'gamekit',
        'gps',
        'gyroscope',
        'location-services',
        'magnetometer',
        'microphone',
        'nfc',
        'opengles-1',
        'opengles-2',
        'opengles-3',
        'peer-peer',
        'still-camera',
        'telephony',
        'video-camera',
        'wifi',
        'metal'
      ]

      for (const capability of capabilities) {
        if (!validCapabilities.includes(capability)) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.MEDIUM,
              'Unknown device capability',
              `Unknown capability: ${capability}`,
              'Remove unknown capabilities or verify they are valid'
            )
          )
        }
      }
    }

    return results
  }
}

module.exports = InfoPlistValidationRule
