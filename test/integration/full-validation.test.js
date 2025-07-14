const AppStoreValidator = require('../../src/validator')
const fs = require('fs')
const path = require('path')
const temp = require('temp')

temp.track()

describe('Full Integration Tests', () => {
  let tempDir

  beforeEach(() => {
    tempDir = temp.mkdirSync('integration-test')
  })

  afterEach(() => {
    temp.cleanupSync()
  })

  test('should run full validation on realistic app structure', async() => {
    const appDir = path.join(tempDir, 'MyApp.app')
    fs.mkdirSync(appDir)

    // Create a realistic Info.plist with some issues
    const plistWithIssues = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.example.myapp</string>
  <key>CFBundleName</key>
  <string>MyApp</string>
  <key>CFBundleDisplayName</key>
  <string>My Really Long App Name That Exceeds Limit</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>NSCameraUsageDescription</key>
  <string>Camera</string>
  <key>MinimumOSVersion</key>
  <string>10.0</string>
</dict>
</plist>`

    fs.writeFileSync(path.join(appDir, 'Info.plist'), plistWithIssues)

    const validator = new AppStoreValidator({ verbose: false })
    await validator.validate(appDir)

    // Should catch multiple issues
    expect(validator.results.length).toBeGreaterThan(3)
    expect(validator.results.some((r) => r.message.includes('display name too long'))).toBe(true)
    expect(validator.results.some((r) => r.message.includes('description too short'))).toBe(true)
    expect(validator.results.some((r) => r.message.includes('Privacy manifest'))).toBe(true)
  })
})
