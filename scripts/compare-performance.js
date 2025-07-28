#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function loadPerformanceResults(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`);
  }
}

function calculateChange(oldValue, newValue) {
  const change = newValue - oldValue;
  const percentChange = ((change / oldValue) * 100).toFixed(2);
  return {
    absolute: change,
    percent: parseFloat(percentChange),
    improved: change < 0,
  };
}

function formatChange(change) {
  const sign = change.absolute >= 0 ? '+' : '';
  const color =
    change.improved ? colors.green
    : change.percent > 10 ? colors.red
    : colors.yellow;
  return `${color}${sign}${change.absolute.toFixed(2)}ms (${sign}${change.percent}%)${colors.reset}`;
}

function formatMilliseconds(ms) {
  return `${ms.toFixed(2)}ms`;
}

function generateMarkdownTable(comparison) {
  const lines = [];

  lines.push('# Performance Comparison Report\n');

  // Metadata section
  lines.push('## Test Information\n');
  lines.push('| Metric | Baseline | Comparison |');
  lines.push('|--------|----------|------------|');

  const baseline = comparison.baseline;
  const compared = comparison.compared;

  lines.push(
    `| **Commit** | ${baseline.commitHash.substring(0, 8)} | ${compared.commitHash.substring(0, 8)} |`
  );
  lines.push(`| **Branch** | ${baseline.branch} | ${compared.branch} |`);
  lines.push(
    `| **Message** | ${baseline.commitMessage.split('\n')[0]} | ${compared.commitMessage.split('\n')[0]} |`
  );
  lines.push(
    `| **Date** | ${new Date(baseline.timestamp).toLocaleString()} | ${new Date(compared.timestamp).toLocaleString()} |`
  );
  lines.push(
    `| **Dirty** | ${baseline.isDirty ? '⚠️ Yes' : '✅ No'} | ${compared.isDirty ? '⚠️ Yes' : '✅ No'} |`
  );

  if (baseline.memo || compared.memo) {
    lines.push(`| **Memo** | ${baseline.memo || '-'} | ${compared.memo || '-'} |`);
  }

  lines.push('\n## Test Configuration\n');
  lines.push(
    `- **Size**: ${baseline.size} (${baseline.totalFiles} files, ${baseline.totalLines} lines)`
  );
  lines.push(`- **Iterations**: ${baseline.iterations} → ${compared.iterations}`);

  // Performance metrics
  lines.push('\n## Keyboard Navigation Performance\n');

  const baselineAvg = comparison.metrics.keyboardNavigation.baseline.averageOperationTime;
  const comparedAvg = comparison.metrics.keyboardNavigation.compared.averageOperationTime;
  const avgChange = comparison.metrics.keyboardNavigation.change;

  lines.push(`### Overall Average Operation Time`);
  lines.push(`- **Baseline**: ${formatMilliseconds(baselineAvg)}`);
  lines.push(`- **Compared**: ${formatMilliseconds(comparedAvg)}`);
  lines.push(`- **Change**: ${formatChange(avgChange)}`);

  // Operation breakdown table
  lines.push('\n### Operation Breakdown\n');
  lines.push(
    '| Operation | Baseline Avg | Compared Avg | Change | Baseline Max | Compared Max | Max Change |'
  );
  lines.push(
    '|-----------|--------------|--------------|--------|--------------|--------------|------------|'
  );

  for (const [operation, data] of Object.entries(
    comparison.metrics.keyboardNavigation.operationBreakdown
  )) {
    const baselineOp = data.baseline;
    const comparedOp = data.compared;
    const avgChange = data.avgChange;
    const maxChange = data.maxChange;

    lines.push(
      `| **${operation}** | ${formatMilliseconds(baselineOp.averageTime)} | ` +
        `${formatMilliseconds(comparedOp.averageTime)} | ${formatChange(avgChange)} | ` +
        `${formatMilliseconds(baselineOp.averageMaxTime)} | ` +
        `${formatMilliseconds(comparedOp.averageMaxTime)} | ${formatChange(maxChange)} |`
    );
  }

  // Summary
  lines.push('\n## Summary\n');

  const improvements = [];
  const regressions = [];

  for (const [operation, data] of Object.entries(
    comparison.metrics.keyboardNavigation.operationBreakdown
  )) {
    if (data.avgChange.improved) {
      improvements.push(`- ${operation}: ${data.avgChange.percent}% faster`);
    } else if (data.avgChange.percent > 5) {
      regressions.push(`- ${operation}: ${data.avgChange.percent}% slower`);
    }
  }

  if (avgChange.improved) {
    lines.push(`✅ **Overall performance improved by ${Math.abs(avgChange.percent)}%**\n`);
  } else if (avgChange.percent > 5) {
    lines.push(`⚠️ **Overall performance regressed by ${avgChange.percent}%**\n`);
  } else {
    lines.push(`➡️ **Performance remained relatively stable (${avgChange.percent}% change)**\n`);
  }

  if (improvements.length > 0) {
    lines.push('### Improvements');
    lines.push(...improvements);
  }

  if (regressions.length > 0) {
    lines.push('\n### Regressions');
    lines.push(...regressions);
  }

  return lines.join('\n');
}

function generateComparison(baselineResults, comparedResults) {
  const comparison = {
    baseline: {
      file: baselineResults.file,
      commitHash: baselineResults.metadata.gitInfo?.commitHash || 'unknown',
      branch: baselineResults.metadata.gitInfo?.branch || 'unknown',
      commitMessage: baselineResults.metadata.gitInfo?.commitMessage || 'unknown',
      isDirty: baselineResults.metadata.gitInfo?.isDirty || false,
      timestamp: baselineResults.metadata.timestamp,
      memo: baselineResults.metadata.memo,
      size: baselineResults.size,
      totalFiles: baselineResults.stats.files,
      totalLines: baselineResults.stats.totalLines,
      iterations: baselineResults.config.iterations,
    },
    compared: {
      file: comparedResults.file,
      commitHash: comparedResults.metadata.gitInfo?.commitHash || 'unknown',
      branch: comparedResults.metadata.gitInfo?.branch || 'unknown',
      commitMessage: comparedResults.metadata.gitInfo?.commitMessage || 'unknown',
      isDirty: comparedResults.metadata.gitInfo?.isDirty || false,
      timestamp: comparedResults.metadata.timestamp,
      memo: comparedResults.metadata.memo,
      size: comparedResults.size,
      totalFiles: comparedResults.stats.files,
      totalLines: comparedResults.stats.totalLines,
      iterations: comparedResults.config.iterations,
    },
    metrics: {
      keyboardNavigation: {
        baseline: baselineResults.summary.keyboardNavigation,
        compared: comparedResults.summary.keyboardNavigation,
        change: calculateChange(
          baselineResults.summary.keyboardNavigation.averageOperationTime,
          comparedResults.summary.keyboardNavigation.averageOperationTime
        ),
        operationBreakdown: {},
      },
    },
  };

  // Compare operation breakdown
  const baselineOps = baselineResults.summary.keyboardNavigation.operationBreakdown;
  const comparedOps = comparedResults.summary.keyboardNavigation.operationBreakdown;

  for (const [operation, baselineData] of Object.entries(baselineOps)) {
    const comparedData = comparedOps[operation];
    if (comparedData) {
      comparison.metrics.keyboardNavigation.operationBreakdown[operation] = {
        baseline: baselineData,
        compared: comparedData,
        avgChange: calculateChange(baselineData.averageTime, comparedData.averageTime),
        maxChange: calculateChange(baselineData.averageMaxTime, comparedData.averageMaxTime),
      };
    }
  }

  return comparison;
}

async function findLatestResults(resultsDir, size) {
  const files = await fs.readdir(resultsDir);
  const perfFiles = files
    .filter((f) => f.startsWith(`perf-${size}-`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (perfFiles.length < 2) {
    throw new Error(`Need at least 2 performance results for size '${size}' to compare`);
  }

  return {
    baseline: path.join(resultsDir, perfFiles[1]),
    compared: path.join(resultsDir, perfFiles[0]),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const resultsDir = path.join(__dirname, '..', 'performance-results');

  // Filter out flags from positional arguments
  const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

  let baselineFile, comparedFile;

  // Parse arguments
  if (positionalArgs.length === 0) {
    // No args: find latest two results for medium size
    const latest = await findLatestResults(resultsDir, 'medium');
    baselineFile = latest.baseline;
    comparedFile = latest.compared;
  } else if (positionalArgs.length === 1) {
    // One arg: size specified, find latest two for that size
    const size = positionalArgs[0];
    const latest = await findLatestResults(resultsDir, size);
    baselineFile = latest.baseline;
    comparedFile = latest.compared;
  } else if (positionalArgs.length === 2) {
    // Two args: two specific files
    baselineFile = path.resolve(positionalArgs[0]);
    comparedFile = path.resolve(positionalArgs[1]);
  } else {
    console.error(
      'Usage: pnpm compare:perf [size] or pnpm compare:perf <baseline-file> <compared-file>'
    );
    process.exit(1);
  }

  // Output format
  const outputFormat = args.includes('--json') ? 'json' : 'markdown';

  if (outputFormat !== 'json') {
    log(`${colors.bright}Performance Comparison Tool${colors.reset}`);
    log('===========================\n');
    log('Loading performance results...', colors.cyan);
  }

  // Load results
  const baselineResults = await loadPerformanceResults(baselineFile);
  const comparedResults = await loadPerformanceResults(comparedFile);

  // Add file references
  baselineResults.file = path.basename(baselineFile);
  comparedResults.file = path.basename(comparedFile);

  // Validate same size
  if (baselineResults.size !== comparedResults.size && outputFormat !== 'json') {
    log(
      `Warning: Comparing different sizes (${baselineResults.size} vs ${comparedResults.size})`,
      colors.yellow
    );
  }

  // Generate comparison
  const comparison = generateComparison(baselineResults, comparedResults);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(comparison, null, 2));
  } else {
    const markdown = generateMarkdownTable(comparison);
    console.log('\n' + markdown);

    // Save to file if requested
    if (args.includes('--save')) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(resultsDir, `comparison-${timestamp}.md`);
      await fs.writeFile(outputFile, markdown);
      log(`\nComparison saved to: ${outputFile}`, colors.green);
    }
  }
}

main().catch((error) => {
  log(`Error: ${error.message}`, colors.red);
  process.exit(1);
});
