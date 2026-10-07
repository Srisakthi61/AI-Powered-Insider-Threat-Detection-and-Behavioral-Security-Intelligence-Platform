/**
 * Root Runner for ITBIS Puppeteer End-to-End Test Suite
 * Usage: node run_puppeteer_tests.js
 */

const path = require('path');
const { spawn } = require('child_process');

const scriptPath = path.join(__dirname, 'frontend', 'tests', 'puppeteer_test_all.js');
const frontendDir = path.join(__dirname, 'frontend');

console.log('Starting ITBIS Puppeteer Automation Suite from repository root...');
console.log(`Executing: node ${scriptPath}`);

const child = spawn(process.execPath, [scriptPath], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: path.join(frontendDir, 'node_modules'),
  },
});

child.on('close', (code) => {
  console.log(`\nPuppeteer test runner completed with exit code: ${code}`);
  process.exit(code);
});
