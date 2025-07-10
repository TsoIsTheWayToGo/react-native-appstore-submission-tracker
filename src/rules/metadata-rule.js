const {
  ValidationRule,
  ValidationResult,
  SEVERITY,
  METADATA_CONSTRAINTS
} = require('../utils/constants')

class MetadataRule extends ValidationRule {
  constructor() {
    super('metadata', 'Validates App Store metadata requirements')
  }

  async validate(validator) {
    const results = []
    const metadata = validator.getMetadata()

    if (!metadata) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.INFO,
          'No metadata file provided for validation',
          'Provide metadata.json for comprehensive validation',
          'Create metadata.json with app description, keywords, etc.'
        )
      )
      return results
    }

    // App name validation
    if (metadata.appName && metadata.appName.length > METADATA_CONSTRAINTS.APP_NAME_MAX_LENGTH) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.HIGH,
          'App name exceeds 30 character limit',
          `Current length: ${metadata.appName.length}`,
          'Shorten app name to 30 characters or less'
        )
      )
    }

    // Description validation
    if (
      metadata.description &&
      metadata.description.length < METADATA_CONSTRAINTS.DESCRIPTION_MIN_LENGTH
    ) {
      results.push(
        new ValidationResult(
          this.name,
          SEVERITY.LOW,
          'App description is very short',
          `Current length: ${metadata.description.length}`,
          'Provide a more detailed app description'
        )
      )
    }

    // Keywords validation
    if (metadata.keywords) {
      const keywordString = metadata.keywords.join(',')
      if (keywordString.length > METADATA_CONSTRAINTS.KEYWORDS_MAX_LENGTH) {
        results.push(
          new ValidationResult(
            this.name,
            SEVERITY.MEDIUM,
            'Keywords exceed 100 character limit',
            `Current length: ${keywordString.length}`,
            'Reduce keywords to fit within 100 characters'
          )
        )
      }
    }

    return results
  }
}

module.exports = MetadataRule
