const { AppStoreValidator } = require("../src/validator");
const path = require("path");

async function basicExample() {
  console.log("🍎 Basic App Store Validation Example\n");

  // Create validator instance
  const validator = new AppStoreValidator({
    verbose: true,
    output: "console",
  });

  try {
    // Example 1: Validate an app bundle
    console.log("Example 1: Validating app bundle...");
    const appPath = "./path/to/YourApp.app";
    const metadataPath = "./examples/sample-metadata.json";

    // Note: This will fail unless you have an actual app bundle
    // const report = await validator.validate(appPath, metadataPath);
    // console.log(report);

    console.log("✅ Example completed successfully");
  } catch (error) {
    console.error("❌ Example failed:", error.message);
    console.log("\n💡 To run this example with a real app:");
    console.log("1. Build your React Native app for iOS");
    console.log("2. Update the appPath variable above");
    console.log("3. Run: node examples/basic-usage.js");
  }

  // Example 2: Programmatic usage with options
  console.log("\nExample 2: Programmatic validation with custom options...");

  const customValidator = new AppStoreValidator({
    verbose: false,
    output: "json",
    ruleOptions: {
      exclude: ["localization"], // Skip localization checks
    },
  });

  console.log("Validator configured with custom options");
  console.log("Active rules:", Array.from(customValidator.rules.keys()));
}

// Run example
if (require.main === module) {
  basicExample().catch(console.error);
}

module.exports = { basicExample };
