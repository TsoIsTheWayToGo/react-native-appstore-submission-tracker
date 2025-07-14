module.exports = {
  // Rule configuration
  rules: {
    'info-plist-validation': 'error',
    'privacy-compliance': 'error',
    'account-deletion': 'warn',
    'permissions': 'warn',
    'assets': 'error',
    'code-signing': 'error',
    'localization': 'info',
    'performance': 'warn',
    'content-policy': 'warn',
    'metadata': 'warn'
  },

  // Rules to ignore completely
  ignore: [
    // 'localization'  // Example: skip localization checks
  ],

  // Custom rules (paths to JS files)
  customRules: [
    // './custom-rules/company-branding-rule.js'
  ],

  // Output configuration
  output: {
    format: 'console', // console, json, junit
    verbose: false,
    colors: true
  },

  // Fail threshold
  failOn: 'high' // critical, high, medium, low
};
