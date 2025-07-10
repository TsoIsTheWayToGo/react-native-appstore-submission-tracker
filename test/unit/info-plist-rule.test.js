const InfoPlistValidationRule = require('../../src/rules/info-plist-rule')
const { SEVERITY } = require('../../src/utils/constants')

describe('InfoPlistValidationRule', () => {
  let rule
  let mockValidator

  beforeEach(() => {
    rule = new InfoPlistValidationRule()
    mockValidator = {
      getInfoPlist: jest.fn()
    }
  })

  test('should return critical error when Info.plist is missing', async() => {
    mockValidator.getInfoPlist.mockReturnValue(null)

    const results = await rule.validate(mockValidator)

    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe(SEVERITY.CRITICAL)
    expect(results[0].message).toContain('Info.plist not found')
  })

  test('should validate required keys', async() => {
    const incompletePlist = {
      CFBundleName: 'TestApp'
      // Missing other required keys
    }

    mockValidator.getInfoPlist.mockReturnValue(incompletePlist)

    const results = await rule.validate(mockValidator)

    const criticalResults = results.filter(
      (r) => r.severity === SEVERITY.CRITICAL
    )
    expect(criticalResults.length).toBeGreaterThan(0)
    expect(
      criticalResults.some((r) => r.message.includes('CFBundleIdentifier'))
    ).toBe(true)
  })

  test('should validate bundle identifier format', async() => {
    const invalidPlist = {
      CFBundleIdentifier: 'invalid bundle id!',
      CFBundleName: 'TestApp',
      CFBundleDisplayName: 'Test App',
      CFBundleVersion: '1',
      CFBundleShortVersionString: '1.0.0',
      LSRequiresIPhoneOS: true
    }

    mockValidator.getInfoPlist.mockReturnValue(invalidPlist)

    const results = await rule.validate(mockValidator)

    expect(
      results.some((r) =>
        r.message.includes('Invalid bundle identifier format')
      )
    ).toBe(true)
  })

  test('should pass validation for valid plist', async() => {
    const validPlist = {
      CFBundleIdentifier: 'com.example.testapp',
      CFBundleName: 'TestApp',
      CFBundleDisplayName: 'Test App',
      CFBundleVersion: '1',
      CFBundleShortVersionString: '1.0.0',
      LSRequiresIPhoneOS: true,
      MinimumOSVersion: '14.0'
    }

    mockValidator.getInfoPlist.mockReturnValue(validPlist)

    const results = await rule.validate(mockValidator)

    const criticalResults = results.filter(
      (r) => r.severity === SEVERITY.CRITICAL
    )
    expect(criticalResults).toHaveLength(0)
  })
})
