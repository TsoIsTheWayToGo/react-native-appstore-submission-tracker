/**
 * Account deletion validation rule
 */

const { ValidationRule, ValidationResult, SEVERITY } = require('../utils/constants')

class AccountDeletionRule extends ValidationRule {
  constructor() {
    super(
      'account-deletion',
      'Validates account deletion requirements for apps with user accounts'
    )
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()
    const metadata = validator.getMetadata()

    // Check if app likely uses account creation
    const hasAccountFeatures = this.detectAccountFeatures(plist, metadata)

    if (hasAccountFeatures.detected) {
      // Changed from HIGH to INFO - now a reminder instead of an error
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Account deletion requirement reminder',
          `Your app appears to use accounts (indicators: ${hasAccountFeatures.indicators.join(
            ', '
          )}). Apple requires account deletion functionality for apps with user accounts.`,
          'Ensure account deletion is implemented in-app or provide deletion instructions easily accessible within the app. This is required for App Store approval.',
          'manual'
        )
      )

      // Additional checks for account-based apps
      this.validateAccountDeletionImplementation(validator, results)
    }

    return results
  }

  detectAccountFeatures(plist, metadata) {
    const indicators = []

    if (!plist) {
      return { detected: false, indicators: [] }
    }

    // Check for user tracking permission (often used with accounts)
    if (plist.NSUserTrackingUsageDescription) {
      indicators.push('User tracking permission')
    }

    // Check for contacts access (often used for account features)
    if (plist.NSContactsUsageDescription) {
      indicators.push('Contacts access')
    }

    // Check for calendar/reminders (account sync features)
    if (plist.NSCalendarsUsageDescription || plist.NSRemindersUsageDescription) {
      indicators.push('Calendar/Reminders access')
    }

    // Check for photo library access (profile pictures, etc.)
    if (plist.NSPhotoLibraryUsageDescription) {
      indicators.push('Photo library access')
    }

    // Check for microphone (voice features in social apps)
    if (plist.NSMicrophoneUsageDescription) {
      indicators.push('Microphone access')
    }

    // Check for camera (profile pictures, content creation)
    if (plist.NSCameraUsageDescription) {
      indicators.push('Camera access')
    }

    // Check metadata for account-related keywords
    if (metadata) {
      const accountKeywords = [
        'account',
        'profile',
        'login',
        'register',
        'signup',
        'user',
        'social'
      ]
      const description = (metadata.description || '').toLowerCase()

      if (accountKeywords.some((keyword) => description.includes(keyword))) {
        indicators.push('Account-related metadata')
      }
    }

    return {
      detected: indicators.length > 0,
      indicators
    }
  }

  validateAccountDeletionImplementation(validator, results) {
    const metadata = validator.getMetadata()

    if (metadata) {
      // Check if app description mentions account deletion
      const deletionKeywords = [
        'delete account',
        'remove account',
        'delete profile',
        'account deletion'
      ]
      const description = (metadata.description || '').toLowerCase()

      const mentionsDeletion = deletionKeywords.some((keyword) => description.includes(keyword))

      if (mentionsDeletion) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.INFO,
            'App metadata mentions account deletion',
            'Good - app appears to address account deletion requirements',
            'Ensure the deletion process is easily accessible within the app'
          )
        )
      } else {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            'No account deletion mentioned in app metadata',
            'Consider adding information about account deletion in app description',
            'Update app description to mention account deletion capabilities'
          )
        )
      }

      // Check for privacy policy or support URL
      if (metadata.privacyPolicyUrl || metadata.supportUrl) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.INFO,
            'Privacy policy or support URL provided',
            'Users can contact for account deletion if not available in-app',
            'Ensure support contacts can handle account deletion requests'
          )
        )
      } else {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            'No privacy policy or support URL provided',
            'Consider providing a way for users to contact for account deletion',
            'Add privacy policy URL or support contact information'
          )
        )
      }
    }

    // Additional validation for common account deletion implementations
    results.push(
      new ValidationResult(
        this.name,
        SEVERITY.INFO,
        'Account deletion implementation checklist',
        'Ensure the following account deletion requirements are met',
        `• Account deletion option is easily discoverable in app settings
          • Deletion removes all personal data and user-generated content  
          • Process completes within 30 days of request
          • Users receive confirmation of deletion
          • Option to download data before deletion (if required by law)`,
        'manual'
      )
    )
  }
}

module.exports = AccountDeletionRule
