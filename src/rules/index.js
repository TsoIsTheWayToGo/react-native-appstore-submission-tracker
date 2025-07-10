/**
 * Validation rules exports
 */

const InfoPlistValidationRule = require('./info-plist-rule')
const PrivacyComplianceRule = require('./privacy-rule')
const AccountDeletionRule = require('./account-deletion-rule')
const PermissionsRule = require('./permissions-rule')
const AssetsRule = require('./assets-rule')
const CodeSigningRule = require('./code-signing-rule')
const LocalizationRule = require('./localization-rule')
const PerformanceRule = require('./performance-rule')
const ContentPolicyRule = require('./content-policy-rule')
const MetadataRule = require('./metadata-rule')

module.exports = {
  InfoPlistValidationRule,
  PrivacyComplianceRule,
  AccountDeletionRule,
  PermissionsRule,
  AssetsRule,
  CodeSigningRule,
  LocalizationRule,
  PerformanceRule,
  ContentPolicyRule,
  MetadataRule
}
