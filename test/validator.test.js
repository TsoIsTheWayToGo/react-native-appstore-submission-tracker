const { AppStoreValidator } = require('../src/validator')
const { SEVERITY } = require('../src/utils/constants')
const fs = require('fs')
const path = require('path')
const temp = require('temp')

// Automatically track and cleanup temp files
temp.track()

describe('AppStoreValidator', () => {
  let tempDir
  let validator

  beforeEach(() => {
    tempDir = temp.mkdirSync('validator-test')
    validator = new AppStoreValidator({ verbose: false })
  })

  afterEach(() => {
    temp.cleanupSync()
  })

  describe('Basic Validation', () => {
    test('should throw error for non-existent build path', async() => {
      await expect(validator.validate('/non/existent/path')).rejects.toThrow(
        'Build path does not exist'
      )
    })

    test('should throw error for invalid build type', async() => {
      const invalidFile = path.join(tempDir, 'invalid.txt')
      fs.writeFileSync(invalidFile, 'test')

      await expect(validator.validate(invalidFile)).rejects.toThrow(
        'Build path must be either a .app directory or .ipa file'
      )
    })

    test('should validate app bundle with valid Info.plist', async() => {
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const validPlist = createValidPlist()
      fs.writeFileSync(path.join(appDir, 'Info.plist'), validPlist)

      const report = await validator.validate(appDir)
      expect(report).toContain('App Store Submission Validation Report')
    })
  })

  describe('Info.plist Validation', () => {
    test('should detect missing required keys', async() => {
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const incompletePlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>TestApp</string>
</dict>
</plist>`

      fs.writeFileSync(path.join(appDir, 'Info.plist'), incompletePlist)

      await validator.validate(appDir)

      const criticalResults = validator.results.filter((r) => r.severity === SEVERITY.CRITICAL)
      expect(criticalResults.length).toBeGreaterThan(0)
      expect(criticalResults.some((r) => r.message.includes('CFBundleIdentifier'))).toBe(true)
    })

    test('should validate bundle identifier format', async() => {
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const invalidBundleIdPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>invalid bundle id with spaces!</string>
  <key>CFBundleName</key>
  <string>TestApp</string>
  <key>CFBundleDisplayName</key>
  <string>Test App</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
</dict>
</plist>`

      fs.writeFileSync(path.join(appDir, 'Info.plist'), invalidBundleIdPlist)

      await validator.validate(appDir)

      const highResults = validator.results.filter((r) => r.severity === SEVERITY.HIGH)
      expect(highResults.some((r) => r.message.includes('Invalid bundle identifier format'))).toBe(
        true
      )
    })
  })

  describe('Privacy Validation', () => {
    test('should detect missing privacy manifest', async() => {
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const plistWithPermissions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.example.testapp</string>
  <key>NSCameraUsageDescription</key>
  <string>This app uses camera to take photos</string>
  <key>CFBundleName</key>
  <string>TestApp</string>
  <key>CFBundleDisplayName</key>
  <string>Test App</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
</dict>
</plist>`

      fs.writeFileSync(path.join(appDir, 'Info.plist'), plistWithPermissions)

      await validator.validate(appDir)

      const highResults = validator.results.filter((r) => r.severity === SEVERITY.HIGH)
      expect(highResults.some((r) => r.message.includes('Privacy manifest'))).toBe(true)
    })
  })

  describe('Output Formats', () => {
    test('should generate JSON output', async() => {
      const jsonValidator = new AppStoreValidator({ verbose: false, output: 'json' })
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const validPlist = createValidPlist()
      fs.writeFileSync(path.join(appDir, 'Info.plist'), validPlist)

      const report = await jsonValidator.validate(appDir)
      const parsed = JSON.parse(report)

      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('results')
      expect(parsed).toHaveProperty('generatedAt')
    })

    test('should generate JUnit XML output', async() => {
      const junitValidator = new AppStoreValidator({ verbose: false, output: 'junit' })
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const validPlist = createValidPlist()
      fs.writeFileSync(path.join(appDir, 'Info.plist'), validPlist)

      const report = await junitValidator.validate(appDir)

      expect(report).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(report).toContain('<testsuite name="AppStoreValidation"')
    })
  })

  describe('Metadata Validation', () => {
    test('should validate metadata when provided', async() => {
      const appDir = path.join(tempDir, 'TestApp.app')
      fs.mkdirSync(appDir)

      const validPlist = createValidPlist()
      fs.writeFileSync(path.join(appDir, 'Info.plist'), validPlist)

      const metadata = {
        appName: 'This is a very long app name that exceeds the 30 character limit',
        description: 'Short',
        keywords: [
          'very',
          'long',
          'list',
          'of',
          'keywords',
          'that',
          'exceeds',
          'the',
          'one',
          'hundred',
          'character',
          'limit',
          'definitely'
        ]
      }

      const metadataFile = path.join(tempDir, 'metadata.json')
      fs.writeFileSync(metadataFile, JSON.stringify(metadata))

      await validator.validate(appDir, metadataFile)

      const results = validator.results
      expect(results.some((r) => r.message.includes('App name exceeds 30 character limit'))).toBe(
        true
      )
      expect(results.some((r) => r.message.includes('description is very short'))).toBe(true)
    })
  })

  function createValidPlist() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.example.testapp</string>
  <key>CFBundleName</key>
  <string>TestApp</string>
  <key>CFBundleDisplayName</key>
  <string>Test App</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>MinimumOSVersion</key>
  <string>14.0</string>
</dict>
</plist>`
  }
})
