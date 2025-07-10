# React Native App Store Submission Tracker

[![npm version](https://badge.fury.io/js/react-native-appstore-submission-tracker.svg)](https://badge.fury.io/js/react-native-appstore-submission-tracker)
[![CI](https://github.com/yourusername/react-native-appstore-submission-tracker/workflows/CI/badge.svg)](https://github.com/yourusername/react-native-appstore-submission-tracker/actions)
[![codecov](https://codecov.io/gh/yourusername/react-native-appstore-submission-tracker/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/react-native-appstore-submission-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Catch App Store rejection issues before submission** 🍎

A comprehensive validation tool that checks React Native builds against Apple App Store submission requirements to catch potential rejection issues before you submit. Think of it as "ESLint for App Store compliance."

## 🚀 Why This Tool?

Apple rejects about **40% of iOS app submissions** on first attempt. Most rejections are due to easily preventable issues like:

- Missing privacy descriptions
- Invalid bundle configurations  
- Account deletion requirements
- Asset and metadata problems
- Code signing issues

This tool catches these issues **before submission**, saving you days of review cycles.

## 📦 Installation

### NPM/Yarn
```bash
npm install -g react-native-appstore-submission-tracker
# or
yarn global add react-native-appstore-submission-tracker
```

### Local Installation
```bash
npm install --save-dev react-native-appstore-submission-tracker
# or  
yarn add --dev react-native-appstore-submission-tracker
```

## 🛠 Quick Start

### Basic Usage
```bash
# Validate .app bundle
rn-appstore-validator validate ./ios/build/Build/Products/Release-iphoneos/MyApp.app

# Validate .ipa file  
rn-appstore-validator validate ./MyApp.ipa

# With metadata validation
rn-appstore-validator validate ./MyApp.ipa --metadata ./metadata.json --verbose
```

### CI/CD Integration
```yaml
# GitHub Actions
- name: Validate App Store Compliance
  run: |
    npx react-native-appstore-submission-tracker validate ./MyApp.ipa --output junit
```

## 📋 What It Checks

### ✅ Core Validations
- **Info.plist Configuration**: Bundle ID, versioning, iOS requirements
- **Privacy Compliance**: Privacy manifests, permission descriptions, ATT
- **Account Deletion**: Required deletion flows for account-based apps
- **App Permissions**: Location, camera, microphone usage validation
- **Assets & Icons**: App icons, launch screens, required assets
- **Code Signing**: Signature verification and provisioning profiles
- **Localization**: Multi-language support validation
- **Metadata**: App Store listing requirements
- **Content Policy**: Export compliance and content guidelines

### 🔍 Example Output

```
🍎 App Store Submission Validation Report
══════════════════════════════════════════════════

Summary:
  Total Issues: 5
  Critical: 1  ❌
  High: 2      ⚠️  
  Medium: 1    ⚡
  Low: 1       ℹ️

CRITICAL ISSUES (1):
────────────────────────────────
▶ Missing CFBundleIdentifier in Info.plist
  Rule: INFO_PLIST_VALIDATION
  💡 Fix: Add CFBundleIdentifier to Info.plist

HIGH ISSUES (2):  
────────────────────────────────
▶ Privacy manifest file (PrivacyInfo.xcprivacy) not found
  Rule: PRIVACY_COMPLIANCE
  Details: Required for apps using privacy-impacting APIs
  💡 Fix: Add PrivacyInfo.xcprivacy to your app bundle

▶ App appears to use accounts - ensure account deletion is implemented  
  Rule: ACCOUNT_DELETION
  💡 Fix: Implement in-app account deletion or provide deletion link
```

## 🔧 Advanced Usage

### Custom Configuration
```javascript
// validator.config.js
module.exports = {
  rules: {
    'privacy-compliance': 'error',
    'account-deletion': 'warn', 
    'info-plist-validation': 'error'
  },
  ignore: [
    'localization'  // Skip localization checks
  ],
  customRules: [
    './custom-rules/company-specific-rule.js'
  ]
};
```

### Programmatic Usage
```javascript
const { AppStoreValidator } = require('react-native-appstore-submission-tracker');

const validator = new AppStoreValidator({
  verbose: true,
  output: 'json'
});

const report = await validator.validate('./MyApp.ipa', './metadata.json');
console.log(report);
```

### Metadata File Format
```json
{
  "appName": "My Awesome App",
  "description": "A great app that does amazing things...",
  "keywords": ["productivity", "utility", "business"],
  "category": "Productivity", 
  "privacyPolicyUrl": "https://myapp.com/privacy",
  "supportUrl": "https://myapp.com/support"
}
```

## 🚀 CI/CD Integration Examples

### GitHub Actions
```yaml
name: App Store Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build iOS App
        run: |
          # Your build commands here
          
      - name: Validate App Store Compliance
        run: |
          npx react-native-appstore-submission-tracker validate \
            ./ios/build/MyApp.ipa \
            --metadata ./app-metadata.json \
            --output junit \
            --verbose
            
      - name: Publish Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: App Store Validation
          path: validation-results.xml
          reporter: java-junit
```

### GitLab CI
```yaml
validate_appstore:
  stage: test
  script:
    - npm install -g react-native-appstore-submission-tracker
    - rn-appstore-validator validate ./MyApp.ipa --output json > validation.json
  artifacts:
    reports:
      junit: validation.json
    when: always
```

### Bitrise
```yaml
- script@1:
    title: App Store Validation
    inputs:
    - content: |
        #!/bin/bash
        npm install -g react-native-appstore-submission-tracker
        rn-appstore-validator validate $BITRISE_IPA_PATH --verbose
```

## 🔌 Extending with Custom Rules

Create custom validation rules for your specific needs:

```javascript
// custom-rules/company-branding-rule.js
const { ValidationRule, ValidationResult, SEVERITY } = require('react-native-appstore-submission-tracker');

class CompanyBrandingRule extends ValidationRule {
  constructor() {
    super('COMPANY_BRANDING', 'Validates company branding requirements');
  }

  async validate(validator) {
    const results = [];
    
    // Check if app name includes company name
    if (validator.metadata?.appName && !validator.metadata.appName.includes('ACME')) {
      results.push(new ValidationResult(
        this.name,
        SEVERITY.MEDIUM,
        'App name should include company branding',
        `Current name: ${validator.metadata.appName}`,
        'Add "ACME" to the app name for brand consistency'
      ));
    }
    
    return results;
  }
}

module.exports = CompanyBrandingRule;
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Available Rules](./docs/RULES.md) 
- [Contributing Guide](./docs/CONTRIBUTING.md)
- [Examples](./examples/)

## 🤝 Contributing

We welcome contributions! This tool is most valuable when it stays current with Apple's evolving guidelines.

### How to Contribute
1. **New Validation Rules**: Add rules for new App Store requirements
2. **Bug Fixes**: Fix validation logic or improve accuracy  
3. **Platform Support**: Add Android/Google Play validation
4. **Documentation**: Improve docs and examples
5. **Testing**: Add test cases and improve coverage

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors
```bash
git clone https://github.com/yourusername/react-native-appstore-submission-tracker.git
cd react-native-appstore-submission-tracker
npm install
npm test
npm run lint
```

## 🐛 Common Issues & Solutions

### Issue: "Could not parse Info.plist"
**Solution**: Ensure your build is complete and Info.plist exists in the app bundle.

### Issue: "Code signing verification failed"  
**Solution**: This check only works on macOS. On other platforms, it will skip with a warning.

### Issue: "Privacy manifest not found"
**Solution**: Add `PrivacyInfo.xcprivacy` to your Xcode project (required for new apps as of 2024).

## 📊 Roadmap

- [ ] **Android Support**: Google Play validation rules
- [ ] **Web Dashboard**: Online validation service  
- [ ] **IDE Integration**: VS Code extension
- [ ] **Automated Updates**: Auto-update rules when Apple guidelines change
- [ ] **Performance Checks**: Binary size, launch time validation
- [ ] **Accessibility**: A11y compliance checking

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

## 🙏 Acknowledgments

- Inspired by the React Native community's need for better App Store tooling
- Built with lessons learned from thousands of App Store submissions
- Thanks to all contributors who help keep this tool current

---

**Made with ❤️ for the React Native community**

If this tool saved you time, please ⭐ star the repo and share it with others!