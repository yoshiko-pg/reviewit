#!/usr/bin/env node

import { chromium } from 'playwright';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Performance test configuration
const config = {
  sizes: {
    small: { files: 5, linesPerFile: 100 },
    medium: { files: 20, linesPerFile: 500 },
    large: { files: 50, linesPerFile: 1000 },
    xlarge: { files: 100, linesPerFile: 2000 },
  },
  port: 3456,
  iterations: 3,
  // Currently focused on keyboard navigation, but extensible for other metrics
  measurementTypes: {
    keyboardNavigation: {
      enabled: true,
      description: 'Keyboard navigation performance',
    },
    pageLoad: {
      enabled: false,
      description: 'Initial page load and render time',
    },
    scrolling: {
      enabled: false,
      description: 'Scroll performance',
    },
    fileToggle: {
      enabled: false,
      description: 'File expand/collapse performance',
    },
  },
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function getGitInfo() {
  try {
    const { stdout: hash } = await execAsync('git rev-parse HEAD');
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    const { stdout: message } = await execAsync('git log -1 --pretty=%B');
    const { stdout: author } = await execAsync('git log -1 --pretty=%an');
    const { stdout: date } = await execAsync('git log -1 --pretty=%aI');

    return {
      commitHash: hash.trim(),
      branch: branch.trim(),
      commitMessage: message.trim(),
      author: author.trim(),
      date: date.trim(),
    };
  } catch (error) {
    log('Warning: Could not retrieve git information', colors.yellow);
    return null;
  }
}

async function startDifitServer(size) {
  log('Starting difit server...', colors.blue);

  let actualPort = config.port;

  // Generate diff and pipe to difit
  const generateDiff = spawn('node', [path.join(__dirname, 'generate-large-diff.js'), size]);
  const difitProcess = spawn(
    'node',
    [
      path.join(__dirname, '..', 'dist', 'cli', 'index.js'),
      '--port',
      config.port.toString(),
      '--no-open',
    ],
    {
      env: { ...process.env, NODE_ENV: 'production' },
    }
  );

  // Pipe diff to difit
  generateDiff.stdout.pipe(difitProcess.stdin);

  // Promise to wait for server start
  const serverStarted = new Promise((resolve) => {
    difitProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      log(`  Server output: ${output}`, colors.cyan);

      // Extract actual port from output
      const portMatch = output.match(/http:\/\/localhost:(\d+)/);
      if (portMatch) {
        actualPort = parseInt(portMatch[1]);
        resolve(actualPort);
      }
    });

    difitProcess.stderr.on('data', (data) => {
      log(`  Server error: ${data.toString().trim()}`, colors.red);
    });

    generateDiff.stderr.on('data', (data) => {
      log(`  Diff generator error: ${data.toString().trim()}`, colors.red);
    });
  });

  // Wait for server to start and get actual port
  const port = await Promise.race([
    serverStarted,
    new Promise((resolve) => setTimeout(() => resolve(actualPort), 5000)),
  ]);

  return { process: difitProcess, port };
}

async function measureKeyboardNavigation(page) {
  const metrics = {
    operations: [],
    totalDuration: 0,
    averageOperationTime: 0,
  };

  log('  Testing keyboard navigation performance...', colors.cyan);

  // Wait for initial content to be ready
  // Use simpler wait strategy - just wait for any table row
  try {
    await page.waitForSelector('tr', { timeout: 15000 });
    await page.waitForTimeout(2000); // Give time for React to render all rows
  } catch (error) {
    log('    Warning: Could not find table rows, proceeding anyway', colors.yellow);
  }

  // Measure individual navigation operations
  const navigationTests = [
    { key: 'j', count: 20, description: 'Next line (j)' },
    { key: 'k', count: 10, description: 'Previous line (k)' },
    { key: 'n', count: 5, description: 'Next chunk (n)' },
    { key: 'p', count: 3, description: 'Previous chunk (p)' },
    { key: 'f', count: 3, description: 'Next file (f)' },
    { key: 'F', count: 2, description: 'Previous file (F)' },
  ];

  for (const test of navigationTests) {
    const operations = [];

    for (let i = 0; i < test.count; i++) {
      // Mark start time in the page context
      await page.evaluate(() => {
        window.__navStart = performance.now();
      });

      // Perform navigation
      await page.keyboard.press(test.key);

      // Wait for navigation to complete and measure
      const duration = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Use requestAnimationFrame to ensure rendering is complete
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const duration = performance.now() - window.__navStart;
              resolve(duration);
            });
          });
        });
      });

      operations.push(duration);
      await page.waitForTimeout(50); // Small delay between operations
    }

    const avgDuration = operations.reduce((a, b) => a + b, 0) / operations.length;
    const maxDuration = Math.max(...operations);
    const minDuration = Math.min(...operations);

    metrics.operations.push({
      type: test.description,
      count: test.count,
      durations: operations,
      average: avgDuration,
      max: maxDuration,
      min: minDuration,
    });

    log(
      `    ${test.description}: avg ${avgDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`,
      colors.green
    );
  }

  metrics.totalDuration = metrics.operations.reduce(
    (total, op) => total + op.durations.reduce((a, b) => a + b, 0),
    0
  );

  metrics.averageOperationTime =
    metrics.totalDuration / metrics.operations.reduce((total, op) => total + op.count, 0);

  return metrics;
}

async function measurePerformance(size, options = {}) {
  const { files, linesPerFile } = config.sizes[size];
  const totalLines = files * linesPerFile;
  const results = [];

  log(`\nRunning performance test (${size})...`, colors.yellow);
  log(
    `Files: ${files}, Lines per file: ${linesPerFile}, Total lines: ${totalLines}`,
    colors.yellow
  );

  const browser = await chromium.launch({
    headless: options.headless !== false,
    devtools: options.devtools === true,
  });

  for (let i = 0; i < config.iterations; i++) {
    log(`\nIteration ${i + 1}/${config.iterations}`, colors.blue);

    const { process: difitProcess, port: actualPort } = await startDifitServer(size);
    const iterationMetrics = {
      iteration: i + 1,
      timestamp: new Date().toISOString(),
    };

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Enable performance monitoring
      await context.addInitScript(() => {
        window.__perfMarks = [];
        window.__perfMeasures = [];

        const originalMark = performance.mark.bind(performance);
        const originalMeasure = performance.measure.bind(performance);

        performance.mark = function (name) {
          window.__perfMarks.push({ name, time: performance.now() });
          return originalMark(name);
        };

        performance.measure = function (name, startMark, endMark) {
          const measure = originalMeasure(name, startMark, endMark);
          window.__perfMeasures.push({
            name,
            duration: measure.duration,
            startTime: measure.startTime,
          });
          return measure;
        };
      });

      // Navigate to difit
      const loadStartTime = Date.now();
      await page.goto(`http://localhost:${actualPort}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for initial render - wait for the main container
      await page.waitForSelector('.bg-github-bg-primary', { timeout: 30000 });

      if (config.measurementTypes.pageLoad.enabled) {
        iterationMetrics.pageLoad = {
          domContentLoaded: Date.now() - loadStartTime,
          initialRender: Date.now() - loadStartTime,
        };
      }

      // Run enabled measurements
      if (config.measurementTypes.keyboardNavigation.enabled) {
        iterationMetrics.keyboardNavigation = await measureKeyboardNavigation(page);
      }

      // Collect performance marks and measures
      const perfData = await page.evaluate(() => ({
        marks: window.__perfMarks || [],
        measures: window.__perfMeasures || [],
      }));

      iterationMetrics.performanceData = perfData;

      // Get memory usage if available
      const memoryUsage = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          };
        }
        return null;
      });

      if (memoryUsage) {
        iterationMetrics.memory = memoryUsage;
      }

      await context.close();
      results.push(iterationMetrics);
    } catch (error) {
      log(`  Error: ${error.message}`, colors.red);
      iterationMetrics.error = error.message;
      results.push(iterationMetrics);
    } finally {
      // Kill the process
      difitProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await browser.close();

  return {
    size,
    stats: { files, linesPerFile, totalLines },
    config: {
      iterations: config.iterations,
      enabledMeasurements: Object.entries(config.measurementTypes)
        .filter(([_, config]) => config.enabled)
        .map(([type, config]) => ({ type, ...config })),
    },
    results,
    summary: calculateSummary(results),
  };
}

function calculateSummary(results) {
  const summary = {
    keyboardNavigation: {
      averageOperationTime: 0,
      operationBreakdown: {},
    },
  };

  // Filter out results with errors
  const validResults = results.filter((r) => !r.error);

  if (validResults.length === 0) {
    return summary;
  }

  // Calculate keyboard navigation summary
  if (validResults[0].keyboardNavigation) {
    const allOperationTimes = validResults.map((r) => r.keyboardNavigation.averageOperationTime);
    summary.keyboardNavigation.averageOperationTime =
      allOperationTimes.reduce((a, b) => a + b, 0) / allOperationTimes.length;

    // Group by operation type
    const operationTypes = {};
    validResults.forEach((result) => {
      result.keyboardNavigation.operations.forEach((op) => {
        if (!operationTypes[op.type]) {
          operationTypes[op.type] = {
            count: 0,
            totalAverage: 0,
            totalMax: 0,
          };
        }
        operationTypes[op.type].count++;
        operationTypes[op.type].totalAverage += op.average;
        operationTypes[op.type].totalMax += op.max;
      });
    });

    // Calculate averages
    Object.entries(operationTypes).forEach(([type, data]) => {
      summary.keyboardNavigation.operationBreakdown[type] = {
        averageTime: data.totalAverage / data.count,
        averageMaxTime: data.totalMax / data.count,
      };
    });
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const size = args[0] || 'medium';
  const memo = args.includes('--memo') ? args[args.indexOf('--memo') + 1] : undefined;

  const options = {
    headless: !args.includes('--headed'),
    devtools: args.includes('--devtools'),
  };

  if (!config.sizes[size]) {
    log(`Invalid size: ${size}`, colors.red);
    log(`Available sizes: ${Object.keys(config.sizes).join(', ')}`);
    process.exit(1);
  }

  log(`${colors.bright}Difit Performance Test${colors.reset}`);
  log('======================\n');

  // Install playwright browsers if needed
  try {
    await execAsync('npx playwright install chromium');
  } catch (error) {
    log('Note: Playwright browsers may need to be installed', colors.yellow);
  }

  // Get git information
  const gitInfo = await getGitInfo();

  const startTime = Date.now();
  const results = await measurePerformance(size, options);
  const totalTime = Date.now() - startTime;

  // Add metadata
  results.metadata = {
    timestamp: new Date().toISOString(),
    duration: totalTime,
    gitInfo,
    memo,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  log(`\n${colors.bright}Summary${colors.reset}`);
  log('=======');
  log(`Size: ${results.size}`);
  log(`Total files: ${results.stats.files}`);
  log(`Total lines: ${results.stats.totalLines}`);
  log(
    `Valid iterations: ${results.results.filter((r) => !r.error).length}/${results.config.iterations}`
  );

  if (results.summary.keyboardNavigation.averageOperationTime > 0) {
    log(`\nKeyboard Navigation Performance:`);
    log(
      `  Average operation time: ${results.summary.keyboardNavigation.averageOperationTime.toFixed(2)}ms`
    );
    log(`\n  Operation breakdown:`);
    Object.entries(results.summary.keyboardNavigation.operationBreakdown).forEach(
      ([type, data]) => {
        log(`    ${type}:`);
        log(`      Average: ${data.averageTime.toFixed(2)}ms`);
        log(`      Max average: ${data.averageMaxTime.toFixed(2)}ms`);
      }
    );
  }

  // Save results
  const resultsDir = path.join(__dirname, '..', 'performance-results');
  await fs.mkdir(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(resultsDir, `perf-${size}-${timestamp}.json`);

  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  log(`\nResults saved to: ${resultsFile}`, colors.green);

  if (gitInfo) {
    log(
      `\nCommit: ${gitInfo.commitHash.substring(0, 8)} - ${gitInfo.commitMessage.split('\n')[0]}`
    );
  }

  if (memo) {
    log(`Memo: ${memo}`);
  }
}

main().catch((error) => {
  log(`Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
