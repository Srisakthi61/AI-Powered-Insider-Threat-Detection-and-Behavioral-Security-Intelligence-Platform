const newman = require('newman');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const COLLECTION_PATH = path.join(__dirname, 'itbis_api_collection.json');
const ENVIRONMENT_PATH = path.join(__dirname, 'itbis_api_environment.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const JSON_REPORT_PATH = path.join(REPORTS_DIR, 'api_test_report.json');
const HTML_REPORT_PATH = path.join(REPORTS_DIR, 'api_test_report.html');
const SUMMARY_MD_PATH = path.join(REPORTS_DIR, 'summary.md');

/**
 * Check if the target server is active and reachable before running tests.
 */
function checkServerHealth(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = http.get({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: '/',
        timeout: 3000,
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function runSuite() {
  console.log('===============================================================');
  console.log('       ITBIS AUTOMATED API TEST SUITE (NEWMAN RUNNER)         ');
  console.log('===============================================================');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Collection:      ${COLLECTION_PATH}`);
  console.log(`Environment:     ${ENVIRONMENT_PATH}`);
  console.log(`Reports Dir:     ${REPORTS_DIR}\n`);

  console.log('Checking backend server availability...');
  const isServerRunning = await checkServerHealth(BASE_URL);
  if (!isServerRunning) {
    console.error(`\n[ERROR] Backend server at ${BASE_URL} is NOT reachable!`);
    console.error('Please ensure the FastAPI backend is running:');
    console.error('  powershell: .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000\n');
    process.exit(1);
  }
  console.log('Backend server is healthy and responding. Starting Newman execution...\n');

  newman.run({
    collection: require(COLLECTION_PATH),
    environment: require(ENVIRONMENT_PATH),
    reporters: ['cli', 'json', 'htmlextra'],
    reporter: {
      json: {
        export: JSON_REPORT_PATH,
      },
      htmlextra: {
        export: HTML_REPORT_PATH,
        title: 'ITBIS API Automation Test Report',
        showOnlyFails: false,
        noSyntaxHighlighting: false,
        testPaging: true,
      },
    },
  }, function (err, summary) {
    if (err) {
      console.error('[ERROR] Newman encountered a critical execution failure:');
      console.error(err);
      process.exit(1);
    }

    const runStats = summary.run.stats;
    const totalRequests = runStats.requests.total;
    const failedRequests = runStats.requests.failed;
    const totalAssertions = runStats.assertions.total;
    const failedAssertions = runStats.assertions.failed;
    const totalTimeMs = summary.run.timings.completed - summary.run.timings.started;
    const failures = summary.run.failures || [];

    // Generate Markdown summary for fast agent reading and reporting
    let mdReport = `# ITBIS API Automated Test Execution Summary\n\n`;
    mdReport += `- **Execution Time:** ${new Date().toISOString()}\n`;
    mdReport += `- **Target Base URL:** \`${BASE_URL}\`\n`;
    mdReport += `- **Duration:** ${(totalTimeMs / 1000).toFixed(2)}s\n`;
    mdReport += `- **Total Requests:** ${totalRequests} (${failedRequests} failed)\n`;
    mdReport += `- **Total Assertions:** ${totalAssertions} (${failedAssertions} failed)\n`;
    mdReport += `- **HTML Report:** [\`tests/reports/api_test_report.html\`](file:///${HTML_REPORT_PATH.replace(/\\/g, '/')})\n`;
    mdReport += `- **JSON Report:** [\`tests/reports/api_test_report.json\`](file:///${JSON_REPORT_PATH.replace(/\\/g, '/')})\n\n`;

    if (failures.length === 0) {
      mdReport += `### Result: :white_check_mark: ALL TESTS PASSED\n\n`;
      mdReport += `All ${totalRequests} API endpoint tests and ${totalAssertions} assertion checks succeeded without errors.\n`;
    } else {
      mdReport += `### Result: :x: ${failures.length} ISSUE(S) DETECTED\n\n`;
      mdReport += `| # | Request Name | Method | URL | Failed Assertion | Error Message |\n`;
      mdReport += `|---|--------------|--------|-----|------------------|---------------|\n`;
      failures.forEach((f, idx) => {
        const item = f.source ? f.source.name : (f.parent ? f.parent.name : 'Unknown Request');
        const req = f.cursor ? summary.run.executions[f.cursor.position]?.request : null;
        const method = req ? req.method : 'N/A';
        const url = req ? req.url.toString() : 'N/A';
        const assertion = f.error?.test || 'Execution Error';
        const errorMsg = (f.error?.message || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
        mdReport += `| ${idx + 1} | **${item}** | \`${method}\` | \`${url}\` | \`${assertion}\` | \`${errorMsg}\` |\n`;
      });
    }

    fs.writeFileSync(SUMMARY_MD_PATH, mdReport, 'utf8');

    console.log('\n===============================================================');
    console.log('                     TEST EXECUTION SUMMARY                    ');
    console.log('===============================================================');
    console.log(`Requests:   Total: ${totalRequests} | Failed: ${failedRequests}`);
    console.log(`Assertions: Total: ${totalAssertions} | Failed: ${failedAssertions}`);
    console.log(`Duration:   ${(totalTimeMs / 1000).toFixed(2)}s`);
    console.log(`HTML Report saved: ${HTML_REPORT_PATH}`);
    console.log(`JSON Report saved: ${JSON_REPORT_PATH}`);
    console.log(`Summary Report:    ${SUMMARY_MD_PATH}`);
    console.log('===============================================================\n');

    if (failures.length > 0) {
      console.error(`[FAIL] ${failures.length} assertion(s) failed! See details above.`);
      process.exit(1);
    } else {
      console.log('[SUCCESS] All API tests passed successfully!');
      process.exit(0);
    }
  });
}

runSuite().catch((err) => {
  console.error('[UNHANDLED EXCEPTION]:', err);
  process.exit(1);
});
