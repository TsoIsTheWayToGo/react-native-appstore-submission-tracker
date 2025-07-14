/**
 * Report generators for different output formats
 */

const chalk = require('chalk')
const { SEVERITY } = require('../utils/constants')

function generateConsoleReport(results, summary) {
  let output = '\n'
  output += chalk.blue.bold('App Store Submission Validation Report\n')
  output += chalk.gray('═'.repeat(50)) + '\n\n'

  // Summary
  output += chalk.bold('Summary:\n')
  output += `  Total Issues: ${summary.total}\n`
  output += `  ${chalk.red('Critical:')} ${summary.critical}\n`
  output += `  ${chalk.redBright('High:')} ${summary.high}\n`
  output += `  ${chalk.yellow('Medium:')} ${summary.medium}\n`
  output += `  ${chalk.blue('Low:')} ${summary.low}\n`
  output += `  ${chalk.gray('Info:')} ${summary.info}\n\n`

  // Show passed tests
  if (summary.passedRules && summary.passedRules.length > 0) {
    output += chalk.green.bold('✅ PASSED VALIDATIONS:\n')
    output += chalk.green('─'.repeat(30)) + '\n'

    for (const passedRule of summary.passedRules) {
      output += chalk.green(`✓ ${passedRule.name}: ${passedRule.description}\n`)
    }
    output += '\n'
  }

  if (results.length === 0) {
    output += chalk.green.bold(
      '🎉 All validations passed! Your app looks ready for App Store submission.\n'
    )
    return output
  }

  // Results by severity
  const severityOrder = [
    SEVERITY.CRITICAL,
    SEVERITY.HIGH,
    SEVERITY.MEDIUM,
    SEVERITY.LOW,
    SEVERITY.INFO
  ]

  for (const severity of severityOrder) {
    const issuesOfSeverity = results.filter((r) => r.severity === severity)
    if (issuesOfSeverity.length === 0) continue

    const color = getSeverityColor(severity)
    output += color(`${severity} ISSUES (${issuesOfSeverity.length}):\n`)
    output += color('─'.repeat(30)) + '\n'

    for (const result of issuesOfSeverity) {
      output += `\n${color('▶')} ${result.message}\n`
      output += `  Rule: ${result.rule}\n`

      if (result.details) {
        output += `  Details: ${result.details}\n`
      }

      if (result.fix) {
        if (result.fixType === 'manual') {
          output += chalk.green(`  (Manually test) ${result.fix}\n`)
        } else {
          output += chalk.green(`  🛠️ Fix: ${result.fix}\n`)
        }
      }
    }
    output += '\n'
  }

  // Recommendations
  if (summary.critical > 0) {
    output += chalk.red.bold('⚠️  CRITICAL ISSUES DETECTED - App will likely be rejected!\n')
  } else if (summary.high > 0) {
    output += chalk.yellow.bold(
      '⚠️  High-risk issues found - Review recommended before submission\n'
    )
  } else {
    output += chalk.green.bold('✅ No critical issues found - App appears ready for submission\n')
  }

  return output
}

function generateJsonReport(results, summary) {
  return JSON.stringify(
    {
      summary,
      results: results.map((r) => r.toJSON()),
      generatedAt: new Date().toISOString()
    },
    null,
    2
  )
}

function generateJUnitReport(results, summary) {
  const testCases = results
    .map((result) => {
      const isFailure = [SEVERITY.CRITICAL, SEVERITY.HIGH].includes(result.severity)
      const escapedMessage = escapeXml(result.message)
      const escapedDetails = escapeXml(result.details || '')

      return `    <testcase name="${escapeXml(
        result.rule
      )}" classname="AppStoreValidation" time="0">
${
  isFailure
    ? `      <failure message="${escapedMessage}" type="${result.severity}">${escapedDetails}</failure>`
    : ''
}
    </testcase>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="AppStoreValidation" tests="${results.length}" failures="${
    summary.critical + summary.high
  }" time="0">
${testCases}
</testsuite>`
}

function getSeverityColor(severity) {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return chalk.red.bold
    case SEVERITY.HIGH:
      return chalk.redBright
    case SEVERITY.MEDIUM:
      return chalk.yellow
    case SEVERITY.LOW:
      return chalk.blue
    default:
      return chalk.gray
  }
}

function escapeXml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

module.exports = {
  generateConsoleReport,
  generateJsonReport,
  generateJUnitReport
}
