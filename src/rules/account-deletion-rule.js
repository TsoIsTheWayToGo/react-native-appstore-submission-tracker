/**
 * Account deletion validation rule
 */

const {
  ValidationRule,
  ValidationResult,
  SEVERITY
} = require('../utils/constants')

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
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'App appears to use accounts - ensure account deletion is implemented',
          `Indicators: ${hasAccountFeatures.indicators.join(', ')}`,
          'Implement in-app account deletion or provide deletion instructions accessible within the app'
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

    // Check for authentication-related permissions
    if (plist.NSUserTrackingUsageDescription) {
      indicators.push('User tracking permission')
    }

    if (plist.NSContactsUsageDescription) {
      indicators.push('Contacts access')
    }

    // Check for URL schemes that might indicate social login
    if (plist.CFBundleURLTypes) {
      for (const urlType of plist.CFBundleURLTypes) {
        if (urlType.CFBundleURLSchemes) {
          for (const scheme of urlType.CFBundleURLSchemes) {
            const socialSchemes = [
              'fb',
              'google',
              'twitter',
              'linkedin',
              'apple'
            ]
            if (
              socialSchemes.some((social) =>
                scheme.toLowerCase().includes(social)
              )
            ) {
              indicators.push(`Social login URL scheme: ${scheme}`)
            }
          }
        }
      }
    }

    // Check metadata for account-related terms
    if (metadata) {
      const accountKeywords = [
        'login',
        'account',
        'register',
        'signup',
        'profile',
        'user'
      ]
      const descriptionText = (metadata.description || '').toLowerCase()
      const appNameText = (metadata.appName || '').toLowerCase()

      for (const keyword of accountKeywords) {
        if (
          descriptionText.includes(keyword) ||
          appNameText.includes(keyword)
        ) {
          indicators.push(`Account-related term in metadata: ${keyword}`)
          break // Only add one indicator for metadata
        }
      }
    }

    // Check for iCloud entitlements (often used with user accounts)
    if (plist.com && plist.com.apple && plist.com.apple.developer) {
      const entitlements = plist.com.apple.developer
      if (entitlements.icloud || entitlements.ubiquity) {
        indicators.push('iCloud integration')
      }
    }

    return {
      detected: indicators.length > 0,
      indicators
    }
  }

  validateAccountDeletionImplementation(validator, results) {
    const metadata = validator.getMetadata()

    // Check if metadata includes account deletion information
    if (metadata) {
      const deletionKeywords = [
        'delete',
        'deletion',
        'remove account',
        'close account'
      ]
      const description = (metadata.description || '').toLowerCase()

      const mentionsDeletion = deletionKeywords.some((keyword) =>
        description.includes(keyword)
      )

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
            SEVERITY.HIGH,
            'No privacy policy or support URL provided',
            'Account-based apps must provide way to contact for account deletion',
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
        'Verify the following account deletion requirements are met',
        `• Account deletion option is easily discoverable in app settings
• Deletion removes all personal data and user-generated content  
• Process completes within 30 days of request
• Users receive confirmation of deletion
• Option to download data before deletion (if required by law)`
      )
    )
  }
}

module.exports = AccountDeletionRule
