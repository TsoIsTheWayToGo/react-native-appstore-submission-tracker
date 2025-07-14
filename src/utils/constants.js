/**
 * Constants and shared utilities
 */

// Validation result severities
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
}

class ValidationResult {
  constructor(rule, severity, message, details = null, fix = null, fixType = 'fix') {
    this.rule = rule
    this.severity = severity
    this.message = message
    this.details = details
    this.fix = fix
    this.fixType = fixType // 'fix' or 'manual'
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      rule: this.rule,
      severity: this.severity,
      message: this.message,
      details: this.details,
      fix: this.fix,
      fixType: this.fixType,
      timestamp: this.timestamp
    }
  }
}
// Base class for validation rules
class ValidationRule {
  constructor(name, description) {
    this.name = name
    this.description = description
  }

  async validate(_validator) {
    throw new Error('Subclasses must implement validate method')
  }
}

// App Store Review Guidelines URLs (for reference)
const GUIDELINES = {
  MAIN: 'https://developer.apple.com/app-store/review/guidelines/',
  PRIVACY: 'https://developer.apple.com/app-store/user-privacy-and-data-use/',
  HUMAN_INTERFACE:
    'https://developer.apple.com/design/human-interface-guidelines/',
  ACCOUNT_DELETION:
    'https://developer.apple.com/support/offering-account-deletion-in-your-app/',
  PRIVACY_MANIFEST:
    'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files'
}

// Common App Store rejection reasons
const COMMON_REJECTIONS = {
  MISSING_PRIVACY_POLICY: '5.1.1 - Privacy Policy',
  INSUFFICIENT_PRIVACY_DESCRIPTION: '5.1.1 - Data Use and Privacy',
  MISSING_ACCOUNT_DELETION: '5.1.1 - Data Collection and Storage',
  INCOMPLETE_FUNCTIONALITY: '2.1 - App Store Review Guidelines',
  MISLEADING_METADATA: '2.3.1 - Accurate Metadata',
  INAPPROPRIATE_CONTENT: '1.1 - Objectionable Content',
  BROKEN_LINKS: '2.1 - App Store Review Guidelines',
  PLACEHOLDER_CONTENT: '2.1 - App Store Review Guidelines'
}

// Required Info.plist keys
const REQUIRED_PLIST_KEYS = [
  'CFBundleIdentifier',
  'CFBundleName',
  'CFBundleDisplayName',
  'CFBundleVersion',
  'CFBundleShortVersionString',
  'LSRequiresIPhoneOS'
]

// Privacy-sensitive permission keys
const PRIVACY_PERMISSION_KEYS = [
  'NSCameraUsageDescription',
  'NSLocationWhenInUseUsageDescription',
  'NSLocationAlwaysAndWhenInUseUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'NSPhotoLibraryAddUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSContactsUsageDescription',
  'NSCalendarsUsageDescription',
  'NSRemindersUsageDescription',
  'NSMotionUsageDescription',
  'NSHealthUpdateUsageDescription',
  'NSHealthShareUsageDescription',
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
  'NSUserTrackingUsageDescription',
  'NSSpeechRecognitionUsageDescription',
  'NSFaceIDUsageDescription',
  'NSLocalNetworkUsageDescription'
]

// App Store metadata constraints
const METADATA_CONSTRAINTS = {
  APP_NAME_MAX_LENGTH: 30,
  SUBTITLE_MAX_LENGTH: 30,
  KEYWORDS_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 100,
  PROMOTIONAL_TEXT_MAX_LENGTH: 170
}

// File size constraints
const FILE_CONSTRAINTS = {
  MAX_IPA_SIZE: 4 * 1024 * 1024 * 1024, // 4GB
  MAX_APP_ICON_SIZE: 1024, // 1024x1024 pixels
  REQUIRED_ICON_SIZES: [
    { size: 20, scale: 2 },
    { size: 20, scale: 3 },
    { size: 29, scale: 2 },
    { size: 29, scale: 3 },
    { size: 40, scale: 2 },
    { size: 40, scale: 3 },
    { size: 60, scale: 2 },
    { size: 60, scale: 3 }
  ]
}

// iOS version support
const IOS_SUPPORT = {
  MINIMUM_SUPPORTED: '12.0',
  RECOMMENDED_MINIMUM: '14.0',
  LATEST_SDK_REQUIRED: '18.0'
}

module.exports = {
  SEVERITY,
  ValidationResult,
  ValidationRule,
  GUIDELINES,
  COMMON_REJECTIONS,
  REQUIRED_PLIST_KEYS,
  PRIVACY_PERMISSION_KEYS,
  METADATA_CONSTRAINTS,
  FILE_CONSTRAINTS,
  IOS_SUPPORT
}
