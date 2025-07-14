const {
  ValidationRule,
  ValidationResult,
  SEVERITY,
  PRIVACY_PERMISSION_KEYS
} = require('../utils/constants')
const path = require('path')
const fs = require('fs')
const yauzl = require('yauzl')

class PrivacyComplianceRule extends ValidationRule {
  constructor() {
    super('privacy-compliance', 'Validates privacy compliance requirements')
  }

  async validate(validator) {
    const results = []
    const plist = validator.getInfoPlist()

    if (!plist) return results

    // Enhanced privacy manifest detection
    const manifestResult = await this.checkPrivacyManifest(validator)
    if (manifestResult) {
      results.push(manifestResult)
    }

    // Check permission descriptions
    results.push(...this.checkPermissionDescriptions(plist))

    // Check for potential privacy-impacting usage
    results.push(...this.checkPrivacyImpactingAPIs(plist))

    return results
  }

  async checkPrivacyManifest(validator) {
    const buildPath = validator.getBuildPath()

    try {
      if (buildPath.endsWith('.ipa')) {
        const hasMainManifest = await this.checkIPAForPrivacyManifest(buildPath)
        if (hasMainManifest) {
          return null // Found main app manifest
        }
      } else if (buildPath.endsWith('.app')) {
        const manifestPath = path.join(buildPath, 'PrivacyInfo.xcprivacy')
        if (fs.existsSync(manifestPath)) {
          return null // Found manifest
        }
      }

      // Check if this app actually needs a privacy manifest
      const needsManifest = this.determineIfPrivacyManifestRequired(validator.getInfoPlist())

      if (!needsManifest) {
        return new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'Privacy manifest not found, but may not be required',
          'Your app may not use privacy-impacting APIs that require a manifest',
          'Review if your app uses required reason APIs: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files'
        )
      }

      return new ValidationResult(
        this.name,
        SEVERITY.HIGH,
        'Privacy manifest file (PrivacyInfo.xcprivacy) not found',
        'Required for apps using privacy-impacting APIs as of May 2024',
        'Add PrivacyInfo.xcprivacy to your app bundle root directory'
      )
    } catch (error) {
      return new ValidationResult(
        this.name,
        SEVERITY.LOW,
        'Could not verify privacy manifest presence',
        `Error checking for privacy manifest: ${error.message}`,
        'Manually verify PrivacyInfo.xcprivacy exists in your app bundle'
      )
    }
  }

  async checkIPAForPrivacyManifest(ipaPath) {
    return new Promise((resolve, reject) => {
      yauzl.open(ipaPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err)
          return
        }

        let foundMainManifest = false

        zipfile.readEntry()
        zipfile.on('entry', (entry) => {
          // Look for main app privacy manifest (not SDK manifests)
          if (entry.fileName.match(/Payload\/[^/]+\.app\/PrivacyInfo\.xcprivacy$/)) {
            foundMainManifest = true
            zipfile.close()
            resolve(true)
            return
          }
          zipfile.readEntry()
        })

        zipfile.on('end', () => {
          resolve(foundMainManifest)
        })

        zipfile.on('error', (err) => {
          reject(err)
        })
      })
    })
  }

  determineIfPrivacyManifestRequired(plist) {
    if (!plist) return false

    // Check for privacy-sensitive permissions that often require manifests
    const privacySensitiveKeys = [
      'NSCameraUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSLocationAlwaysAndWhenInUseUsageDescription',
      'NSUserTrackingUsageDescription',
      'NSFaceIDUsageDescription',
      'NSContactsUsageDescription'
    ]

    // If app has privacy-sensitive permissions, it likely needs a manifest
    return privacySensitiveKeys.some((key) => plist[key])
  }

  checkPermissionDescriptions(plist) {
    const results = []

    for (const key of PRIVACY_PERMISSION_KEYS) {
      if (plist[key]) {
        const description = plist[key]

        // Check for overly short descriptions
        if (description.length < 30) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.MEDIUM,
              `${key} description too short`,
              `Current: "${description}" (${description.length} characters)`,
              'Provide a clear, detailed explanation of why this permission is needed (minimum 30 characters)'
            )
          )
        }

        // Check for generic/placeholder descriptions
        const genericPhrases = [
          'for easy authentication',
          'to access camera',
          'to access location',
          'app needs this',
          'required for functionality'
        ]

        if (genericPhrases.some((phrase) => description.toLowerCase().includes(phrase))) {
          results.push(
            new ValidationResult(
              this.name,
              SEVERITY.LOW,
              `${key} has generic description`,
              `Consider providing more specific explanation: "${description}"`,
              'Explain specifically how your app uses this permission'
            )
          )
        }
      }
    }

    return results
  }

  checkPrivacyImpactingAPIs(plist) {
    const results = []

    // Check for potentially problematic location usage
    if (
      plist.NSLocationAlwaysAndWhenInUseUsageDescription &&
      plist.NSLocationWhenInUseUsageDescription
    ) {
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

    return results
  }
}

module.exports = PrivacyComplianceRule
