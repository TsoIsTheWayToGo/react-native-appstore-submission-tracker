/**
 * Privacy compliance validation rule
 */

const {
  ValidationRule,
  ValidationResult,
  SEVERITY,
  PRIVACY_PERMISSION_KEYS
} = require('../utils/constants')
const path = require('path')
const fs = require('fs')

class PrivacyComplianceRule extends ValidationRule {
  constructor() {
    super(
      'privacy-compliance',
      'Validates privacy-related requirements including manifests and permissions'
    )
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()
    const buildPath = validator.getBuildPath()

    // Check for privacy manifest (required for new submissions)
    await this.validatePrivacyManifest(validator, results)

    // Validate permission purpose strings
    this.validatePermissionStrings(plist, results)

    // Validate App Tracking Transparency
    this.validateATT(plist, results)

    // Check for data collection indicators
    this.validateDataCollection(plist, results)

    // Validate third-party SDK requirements
    await this.validateThirdPartySDKs(validator, results)

    return results
  }

  async validatePrivacyManifest(validator, results) {
    const buildPath = validator.getBuildPath()
    let privacyManifestPath

    // Determine privacy manifest path based on build type
    if (buildPath.endsWith('.app')) {
      privacyManifestPath = path.join(buildPath, 'PrivacyInfo.xcprivacy')
    } else {
      // For IPA files, check if manifest was extracted during parsing
      const fileParser = validator.getFileParser()
      // This would be set during IPA parsing if found
      if (!validator.privacyManifest) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Privacy manifest file (PrivacyInfo.xcprivacy) not found',
            'Required for apps using privacy-impacting APIs as of May 2024',
            'Add PrivacyInfo.xcprivacy to your app bundle root directory'
          )
        )
        return
      }
    }

    // Check if privacy manifest exists for .app bundles
    if (buildPath.endsWith('.app') && !fs.existsSync(privacyManifestPath)) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'Privacy manifest file (PrivacyInfo.xcprivacy) not found',
          'Required for apps using privacy-impacting APIs as of May 2024',
          'Add PrivacyInfo.xcprivacy to your app bundle root directory'
        )
      )
      return
    }

    // If manifest exists, validate its contents
    if (buildPath.endsWith('.app')) {
      try {
        const plist = require('plist')
        const manifestContent = fs.readFileSync(privacyManifestPath, 'utf8')
        const manifest = plist.parse(manifestContent)
        this.validatePrivacyManifestContent(manifest, results)
      } catch (error) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'Privacy manifest file is invalid',
            `Could not parse PrivacyInfo.xcprivacy: ${error.message}`,
            'Ensure privacy manifest is valid plist format'
          )
        )
      }
    }
  }

  validatePrivacyManifestContent(manifest, results) {
    const requiredKeys = [
      'NSPrivacyTracking',
      'NSPrivacyTrackingDomains',
      'NSPrivacyCollectedDataTypes',
      'NSPrivacyAccessedAPITypes'
    ]

    for (const key of requiredKeys) {
      if (!(key in manifest)) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            `Privacy manifest missing required key: ${key}`,
            'Privacy manifest should declare all data collection practices',
            `Add ${key} to your PrivacyInfo.xcprivacy file`
          )
        )
      }
    }

    // Validate tracking declaration
    if (
      manifest.NSPrivacyTracking === true &&
      (!manifest.NSPrivacyTrackingDomains ||
        manifest.NSPrivacyTrackingDomains.length === 0)
    ) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'Privacy manifest declares tracking but no domains specified',
          'If app tracks users, must specify tracking domains',
          'Add tracking domains to NSPrivacyTrackingDomains or set NSPrivacyTracking to false'
        )
      )
    }
  }

  validatePermissionStrings(plist, results) {
    if (!plist) return

    const foundPermissions = []

    for (const permissionKey of PRIVACY_PERMISSION_KEYS) {
      if (plist[permissionKey]) {
        foundPermissions.push(permissionKey)
        const description = plist[permissionKey]

        // Check description length
        if (description.length < 30) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.MEDIUM,
              `${permissionKey} description too short`,
              `Current: "${description}" (${description.length} characters)`,
              'Provide a clear, detailed explanation of why this permission is needed (minimum 30 characters)'
            )
          )
        }

        // Check for generic descriptions
        const genericPhrases = [
          'This app needs access',
          'Required for functionality',
          'Used by the app',
          'Needed for features'
        ]

        if (
          genericPhrases.some((phrase) =>
            description.toLowerCase().includes(phrase.toLowerCase())
          )
        ) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.MEDIUM,
              `${permissionKey} description is too generic`,
              `Current: "${description}"`,
              'Provide specific explanation of how this permission enhances user experience'
            )
          )
        }

        // Check for placeholder text
        if (
          description.includes('TODO') ||
          description.includes('CHANGE ME') ||
          description.includes('...')
        ) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.HIGH,
              `${permissionKey} contains placeholder text`,
              `Current: "${description}"`,
              'Replace placeholder text with actual permission description'
            )
          )
        }
      }
    }

    // Validate specific permission requirements
    this.validateLocationPermissions(plist, results)
    this.validateCameraPermissions(plist, results)
  }

  validateLocationPermissions(plist, results) {
    const hasWhenInUse = plist.NSLocationWhenInUseUsageDescription
    const hasAlwaysAndWhenInUse =
      plist.NSLocationAlwaysAndWhenInUseUsageDescription
    const hasAlways = plist.NSLocationAlwaysUsageDescription

    if (hasAlwaysAndWhenInUse && hasWhenInUse) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.MEDIUM,
          'App requests both always and when-in-use location access',
          'Consider if always access is truly necessary for core functionality',
          'Use most restrictive location permission possible'
        )
      )
    }

    if (hasAlways && !hasWhenInUse) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'Always location permission without when-in-use',
          'NSLocationAlwaysUsageDescription is deprecated',
          'Use NSLocationAlwaysAndWhenInUseUsageDescription with NSLocationWhenInUseUsageDescription'
        )
      )
    }
  }

  validateCameraPermissions(plist, results) {
    const hasCamera = plist.NSCameraUsageDescription
    const hasPhotoLibrary = plist.NSPhotoLibraryUsageDescription
    const hasPhotoLibraryAdd = plist.NSPhotoLibraryAddUsageDescription

    if (hasCamera && !hasPhotoLibrary && !hasPhotoLibraryAdd) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Camera access without photo library permissions',
          'App can take photos but may not save them',
          'Consider adding NSPhotoLibraryAddUsageDescription if users can save photos'
        )
      )
    }
  }

  validateATT(plist, results) {
    if (plist.NSUserTrackingUsageDescription) {
      const description = plist.NSUserTrackingUsageDescription

      // ATT description must mention tracking
      if (!description.toLowerCase().includes('track')) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.HIGH,
            'ATT usage description must mention tracking',
            `Current: "${description}"`,
            'Include the word "tracking" in NSUserTrackingUsageDescription'
          )
        )
      }

      // Check for App Transport Security exceptions
      if (
        plist.NSAppTransportSecurity &&
        plist.NSAppTransportSecurity.NSAllowsArbitraryLoads
      ) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            'ATS disabled with tracking permission',
            'Disabling App Transport Security may indicate data collection concerns',
            'Review if ATS exceptions are necessary and properly justified'
          )
        )
      }
    }
  }

  validateDataCollection(plist, results) {
    const dataCollectionIndicators = [
      'NSUserTrackingUsageDescription',
      'NSContactsUsageDescription',
      'NSCalendarsUsageDescription',
      'NSRemindersUsageDescription'
    ]

    const hasDataCollection = dataCollectionIndicators.some(
      (key) => plist[key]
    )

    if (hasDataCollection) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'App collects personal data',
          'Ensure privacy policy accurately reflects data collection practices',
          'Update App Store Connect privacy labels and provide accessible privacy policy'
        )
      )
    }
  }

  async validateThirdPartySDKs(validator, results) {
    // This is a simplified check - in a real implementation, you'd scan for known SDK signatures
    const plist = validator.getInfoPlist()

    if (!plist) return

    // Check for common analytics/advertising SDKs that require privacy manifests
    const sdkIndicators = {
      Firebase: ['FIREBASE', 'GOOGLE'],
      'Facebook SDK': ['FACEBOOK', 'META'],
      AdMob: ['ADMOB', 'GOOGLE_ADS'],
      Crashlytics: ['CRASHLYTICS', 'FABRIC']
    }

    const plistString = JSON.stringify(plist).toUpperCase()

    for (const [sdkName, indicators] of Object.entries(sdkIndicators)) {
      if (indicators.some((indicator) => plistString.includes(indicator))) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            `Potential ${sdkName} usage detected`,
            'Third-party SDKs may require privacy manifests and signatures',
            `Ensure ${sdkName} includes required privacy manifest and cryptographic signature`
          )
        )
      }
    }
  }
}

module.exports = PrivacyComplianceRule
