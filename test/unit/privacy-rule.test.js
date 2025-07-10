const PrivacyComplianceRule = require('../../src/rules/privacy-rule')

describe('PrivacyComplianceRule', () => {
  let rule
  let mockValidator

  beforeEach(() => {
    rule = new PrivacyComplianceRule()
    mockValidator = {
      getInfoPlist: jest.fn(),
      getBuildPath: jest.fn(),
      getFileParser: jest.fn(),
      privacyManifest: null
    }
  })

  test('should detect missing privacy manifest for .app bundle', async() => {
    mockValidator.getInfoPlist.mockReturnValue({
      CFBundleIdentifier: 'com.example.test',
      NSCameraUsageDescription: 'Camera access needed'
    })
    mockValidator.getBuildPath.mockReturnValue('/path/to/test.app')

    const results = await rule.validate(mockValidator)

    expect(results.some(r => r.message.includes('Privacy manifest'))).toBe(true)
  })

  test('should validate permission string length', async() => {
    mockValidator.getInfoPlist.mockReturnValue({
      NSCameraUsageDescription: 'Short' // Too short
    })
    mockValidator.getBuildPath.mockReturnValue('/path/to/test.app')

    const results = await rule.validate(mockValidator)

    expect(results.some(r => r.message.includes('description too short'))).toBe(true)
  })
})
