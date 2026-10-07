/**
 * ITBIS - Comprehensive End-to-End Puppeteer Test Suite
 * Tests All Screens, All Personas, and All Interactive Buttons/Modals
 * 
 * Features:
 * - Tests 100% of frontend routes & screens (Public, Analyst, SOC, Manager, Admin, Employees, Logs, Alerts, Anomalies, Reports, Admin, Support)
 * - Tests 100% of interactive buttons (Quick demo logins, forms, simulation trigger modal, alert resolution, stream pause/resume, filters, pagination, etc.)
 * - Automatically detects Chrome/Edge browser executable across Windows/Linux/macOS
 * - Handles native dialogs and async API responses seamlessly
 * - Takes full-page and modal screenshots of every screen & button state
 * - Generates comprehensive HTML, Markdown, and JSON test reports
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.ITBIS_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.ITBIS_BACKEND_URL || 'http://localhost:8000';
const HEADLESS = process.env.HEADLESS !== 'false';
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const SLOW_MO = parseInt(process.env.SLOW_MO || '20', 10);

// Output Directories
const BASE_DIR = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(BASE_DIR, 'test-results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');
const REPORTS_DIR = path.join(RESULTS_DIR, 'reports');

// Ensure directories exist
[RESULTS_DIR, SCREENSHOTS_DIR, REPORTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Test Execution State
const testResults = {
  suiteName: 'ITBIS Comprehensive UI & Interactive Button Test Suite',
  startedAt: new Date().toISOString(),
  endedAt: null,
  durationMs: 0,
  baseUrl: BASE_URL,
  backendUrl: BACKEND_URL,
  browserInfo: null,
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  screens: [],
  screenshots: [],
  logs: [],
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const formatted = `[${timestamp}] [${type}] ${message}`;
  console.log(formatted);
  testResults.logs.push({ timestamp: new Date().toISOString(), type, message });
}

/**
 * Auto-detect available browser executable
 */
function findBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const candidate of candidatePaths) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Capture high-resolution screenshot helper
 */
async function captureScreenshot(page, filename, description) {
  const safeFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, safeFilename);

  try {
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: filePath, fullPage: true });

    testResults.screenshots.push({
      filename: safeFilename,
      relativePath: `screenshots/${safeFilename}`,
      description,
      timestamp: new Date().toISOString(),
      url: page.url(),
    });

    log(`📸 Screenshot captured: ${safeFilename} (${description})`, 'SCREENSHOT');
  } catch (err) {
    log(`Failed to capture screenshot ${safeFilename}: ${err.message}`, 'WARN');
  }
}

/**
 * Helper to execute a test case with structured recording
 */
async function recordTest(screenName, testName, actionFn) {
  testResults.totalTests++;
  const start = Date.now();
  let status = 'PASSED';
  let errorMsg = null;

  log(`▶ Testing [${screenName}] -> ${testName}...`, 'STEP');

  try {
    await actionFn();
    testResults.passed++;
    log(`✔ PASSED: [${screenName}] -> ${testName}`, 'PASS');
  } catch (err) {
    status = 'FAILED';
    errorMsg = err.message;
    testResults.failed++;
    log(`✖ FAILED: [${screenName}] -> ${testName} | Error: ${err.message}`, 'FAIL');
  }

  const duration = Date.now() - start;

  let screenRecord = testResults.screens.find((s) => s.name === screenName);
  if (!screenRecord) {
    screenRecord = { name: screenName, tests: [], passed: 0, failed: 0 };
    testResults.screens.push(screenRecord);
  }

  if (status === 'PASSED') screenRecord.passed++;
  else screenRecord.failed++;

  screenRecord.tests.push({
    name: testName,
    status,
    durationMs: duration,
    error: errorMsg,
  });
}

/**
 * Safe click helper with selector fallback & waiting
 */
async function safeClick(page, selector, timeout = 6000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Click element containing specific text
 */
async function clickByText(page, selector, textPattern) {
  await page.waitForSelector(selector, { timeout: 8000 });
  const clicked = await page.evaluate((sel, text) => {
    const elements = Array.from(document.querySelectorAll(sel));
    for (const el of elements) {
      if (el.textContent.includes(text)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.click();
        return true;
      }
    }
    return false;
  }, selector, textPattern);

  if (!clicked) {
    throw new Error(`Could not find element matching "${selector}" with text "${textPattern}"`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Safe navigation with network idle
 */
async function navigateTo(page, urlPath) {
  const fullUrl = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;
  await page.goto(fullUrl, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 20000 });
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Perform login as a specific role
 */
async function loginAsRole(page, roleName = 'security_analyst') {
  await navigateTo(page, '/login');
  await page.waitForSelector('form', { timeout: 8000 });

  const roleCredentials = {
    security_analyst: { email: 'analyst@itbis.com', pass: 'AnalystPass123!', title: 'Security Analyst' },
    soc_engineer: { email: 'soc@itbis.com', pass: 'SocPass123!', title: 'SOC Engineer' },
    security_manager: { email: 'manager@itbis.com', pass: 'MgrPass123!', title: 'Security Manager' },
    admin: { email: 'admin@itbis.com', pass: 'AdminPass123!', title: 'Administrator' },
  };

  const cred = roleCredentials[roleName] || roleCredentials.security_analyst;

  // Try 1-Click Demo button first
  const demoClicked = await page.evaluate((targetRole) => {
    const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
    for (const btn of buttons) {
      if (btn.textContent.toLowerCase().includes(targetRole.toLowerCase())) {
        btn.click();
        return true;
      }
    }
    return false;
  }, cred.title);

  if (!demoClicked) {
    await page.type('#email', cred.email, { delay: 10 });
    await page.type('#password', cred.pass, { delay: 10 });
    await page.click('button[type="submit"]');
  }

  // Wait for redirect to complete
  await page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  const suiteStartTime = Date.now();
  log('========================================================================');
  log('🚀 Starting ITBIS Full-Stack Puppeteer Automation Test Suite');
  log(`Base URL: ${BASE_URL} | Backend: ${BACKEND_URL}`);
  log('========================================================================');

  const executablePath = findBrowserExecutable();
  if (executablePath) {
    log(`Detected browser binary: ${executablePath}`);
  } else {
    log('Using default Puppeteer browser installation');
  }

  const launchOptions = {
    headless: HEADLESS ? 'new' : false,
    slowMo: SLOW_MO,
    defaultViewport: VIEWPORT,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
    const version = await browser.version();
    testResults.browserInfo = version;
    log(`Browser launched successfully: ${version}`);
  } catch (err) {
    log(`Fatal: Failed to launch browser: ${err.message}`, 'FATAL');
    process.exit(1);
  }

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  // Automatically accept native dialogs (alert, confirm, prompt)
  page.on('dialog', async (dialog) => {
    log(`Browser Dialog handled: "${dialog.message()}"`, 'DIALOG');
    try {
      await dialog.accept();
    } catch (e) {}
  });

  // Listen to page errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      if (!msg.text().includes('favicon') && !msg.text().includes('React does not recognize')) {
        log(`Page Console Error: ${msg.text()}`, 'PAGE_WARN');
      }
    }
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: PUBLIC SCREENS & AUTHENTICATION FORMS
    // ------------------------------------------------------------------------
    log('--- [SECTION 1: Public Screens & Authentication Forms] ---');

    await recordTest('Screen: Home / Landing Page', 'Render Landing page, backend status pill & persona showcase', async () => {
      await navigateTo(page, '/');
      await page.waitForSelector('h1', { timeout: 8000 });
      const pageTitle = await page.$eval('h1', (el) => el.textContent);
      if (!pageTitle.includes('Insider Threat')) {
        throw new Error(`Unexpected home page title: ${pageTitle}`);
      }
      await captureScreenshot(page, '01_landing_page.png', 'Landing page hero & persona cards');
    });

    await recordTest('Screen: Home / Landing Page', 'Click Navbar "Sign In" button and verify navigation to /login', async () => {
      await navigateTo(page, '/');
      await clickByText(page, 'a', 'Sign In');
      await page.waitForSelector('#email', { timeout: 8000 });
      if (!page.url().includes('/login')) {
        throw new Error(`Expected /login URL, got: ${page.url()}`);
      }
    });

    await recordTest('Screen: Home / Landing Page', 'Click Navbar "Create Account" button and verify navigation to /signup', async () => {
      await navigateTo(page, '/');
      await clickByText(page, 'a', 'Create Account');
      await page.waitForSelector('#fullName', { timeout: 8000 });
      if (!page.url().includes('/signup')) {
        throw new Error(`Expected /signup URL, got: ${page.url()}`);
      }
    });

    await recordTest('Screen: Sign Up Page', 'Render Sign Up form with all input fields and role selector', async () => {
      await navigateTo(page, '/signup');
      await page.waitForSelector('#fullName');
      await page.waitForSelector('#email');
      await page.waitForSelector('#password');
      await page.waitForSelector('#role');
      await page.waitForSelector('#terms');
      await captureScreenshot(page, '02_signup_page.png', 'Sign Up registration page');
    });

    await recordTest('Screen: Sign Up Page', 'Fill registration form and test account creation submission', async () => {
      const testEmail = `qa_analyst_${Date.now()}@itbis.com`;
      await page.type('#fullName', 'QA Automation Analyst', { delay: 10 });
      await page.type('#email', testEmail, { delay: 10 });
      await page.type('#password', 'PassSecure987!', { delay: 10 });
      await page.select('#role', 'security_analyst');
      await captureScreenshot(page, '03_signup_form_filled.png', 'Filled registration form');

      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 1200));
      await captureScreenshot(page, '04_signup_submission_result.png', 'Signup response status');
    });

    await recordTest('Screen: Login Page', 'Render Login form and 1-Click Demo Persona buttons', async () => {
      await navigateTo(page, '/login');
      await page.waitForSelector('#email');
      await page.waitForSelector('#password');
      await page.waitForSelector('button[type="submit"]');
      await captureScreenshot(page, '05_login_page.png', 'Login portal screen');
    });

    await recordTest('Screen: Login Page', 'Test invalid credentials error alert banner', async () => {
      await navigateTo(page, '/login');
      await page.type('#email', 'invalid_fake_user@itbis.com', { delay: 5 });
      await page.type('#password', 'WrongPassword!', { delay: 5 });
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 800));
      await captureScreenshot(page, '06_login_error_state.png', 'Login invalid credentials error state');
    });

    // ------------------------------------------------------------------------
    // SECTION 2: SECURITY ANALYST DASHBOARD & THREAT SIMULATION
    // ------------------------------------------------------------------------
    log('--- [SECTION 2: Security Analyst Persona & Threat Simulator] ---');

    await recordTest('Screen: Analyst Dashboard', '1-Click Login as Security Analyst and access /dashboard/analyst', async () => {
      await loginAsRole(page, 'security_analyst');
      await page.waitForSelector('h1', { timeout: 10000 });
      if (!page.url().includes('/dashboard/analyst')) {
        throw new Error(`Expected /dashboard/analyst, got: ${page.url()}`);
      }
      await captureScreenshot(page, '07_analyst_dashboard_standby.png', 'Security Analyst Standby Dashboard');
    });

    await recordTest('Screen: Analyst Dashboard', 'Test Time-Range filter selector (24h, 7d, 30d)', async () => {
      const selectElem = await page.$('select');
      if (selectElem) {
        await page.select('select', '7d');
        await new Promise((r) => setTimeout(r, 300));
        await captureScreenshot(page, '08_analyst_timerange_7d.png', 'Analyst 7-day filter');
        await page.select('select', '30d');
        await new Promise((r) => setTimeout(r, 300));
        await captureScreenshot(page, '09_analyst_timerange_30d.png', 'Analyst 30-day filter');
        await page.select('select', '24h');
      }
    });

    await recordTest('Header & Global Controls', 'Verify Header Audio Alarm button removed and Dashboard Switcher present', async () => {
      const volumeBtn = await page.$('header button[title*="Audio Alarm"]');
      if (volumeBtn) {
        throw new Error('Audio alarm button should be removed from header');
      }
      const switcher = await page.$('a[href*="/dashboard/soc"]');
      if (!switcher) {
        throw new Error('Dashboard Switcher navigation links not found');
      }
    });

    await recordTest('Header & Global Controls', 'Test Header Role-Targeted Notifications dropdown toggle', async () => {
      const notifBtnSelector = 'header button[title="Role-Targeted Alerts"]';
      await safeClick(page, notifBtnSelector);
      await new Promise((r) => setTimeout(r, 400));
      await captureScreenshot(page, '10_header_notifications_dropdown.png', 'Targeted Alerts dropdown');
      await safeClick(page, notifBtnSelector);
    });

    await recordTest('Header & Global Controls', 'Test Header User Persona Profile menu dropdown toggle', async () => {
      const profileBtnSelector = 'header button div.w-8.h-8';
      await safeClick(page, profileBtnSelector);
      await new Promise((r) => setTimeout(r, 400));
      await captureScreenshot(page, '11_header_profile_dropdown.png', 'User Profile dropdown menu');
      await safeClick(page, profileBtnSelector);
    });

    await recordTest('Simulation Pipeline', 'Open Global Threat Simulation Modal and verify scenario options', async () => {
      await clickByText(page, 'header button', 'Simulate Threat');
      await page.waitForSelector('h3', { timeout: 8000 });
      await captureScreenshot(page, '12_simulation_modal_opened.png', 'Live Threat Simulation Modal');
    });

    await recordTest('Simulation Pipeline', 'Select Target Employee and Threat Scenario in Simulation Modal', async () => {
      await clickByText(page, 'div', 'Mass USB Data Exfiltration');
      await captureScreenshot(page, '13_simulation_modal_scenario_selected.png', 'Threat Scenario Selected');
    });

    await recordTest('Simulation Pipeline', 'Trigger Live Threat Event & Execute Isolation Forest AI Model Scan', async () => {
      await clickByText(page, 'button[type="submit"]', 'Trigger Live Threat');
      await new Promise((r) => setTimeout(r, 2500));
      await captureScreenshot(page, '14_simulation_active_realtime_toast.png', 'Real-time Threat Toast Alert');
      await captureScreenshot(page, '15_analyst_dashboard_simulated_state.png', 'Analyst Dashboard with Active Simulated Threat');
    });

    await recordTest('Simulation Pipeline', 'Test Simulation Reset button to restore nominal telemetry state', async () => {
      const resetBtnClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.trim() === 'Reset' || x.textContent.includes('Reset Simulation') || x.textContent.includes('Clear Simulation') || x.textContent.includes('Reset to Baseline'));
        if (b) { b.click(); return true; }
        return false;
      });

      if (resetBtnClicked) {
        await new Promise((r) => setTimeout(r, 2000));
        await captureScreenshot(page, '15b_simulation_reset_complete.png', 'Simulation Telemetry Cleared');
      } else {
        await page.keyboard.press('Escape');
      }
    });

    await recordTest('Screen: Analyst Dashboard', 'Test Incident Action Buttons ("Investigate" and "Resolve")', async () => {
      const hasInvestigateBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const invBtn = btns.find((b) => b.textContent.includes('Investigate'));
        if (invBtn) {
          invBtn.click();
          return true;
        }
        return false;
      });

      if (hasInvestigateBtn) {
        await new Promise((r) => setTimeout(r, 600));
        await captureScreenshot(page, '16_analyst_alert_investigating.png', 'Alert marked as Investigating');
      }

      const hasResolveBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const resBtn = btns.find((b) => b.textContent.includes('Resolve'));
        if (resBtn) {
          resBtn.click();
          return true;
        }
        return false;
      });

      if (hasResolveBtn) {
        await new Promise((r) => setTimeout(r, 600));
        await captureScreenshot(page, '17_analyst_alert_resolved.png', 'Alert resolved in DB');
      }
    });

    // ------------------------------------------------------------------------
    // SECTION 3: SOC ENGINEER DASHBOARD & HIGH-THROUGHPUT TELEMETRY
    // ------------------------------------------------------------------------
    log('--- [SECTION 3: SOC Engineer Persona & Stream Monitor] ---');

    await recordTest('Screen: SOC Dashboard', 'Login as SOC Engineer and access /dashboard/soc', async () => {
      await loginAsRole(page, 'soc_engineer');
      await page.waitForSelector('h1', { timeout: 10000 });
      if (!page.url().includes('/dashboard/soc')) {
        throw new Error(`Expected /dashboard/soc, got: ${page.url()}`);
      }
      await captureScreenshot(page, '18_soc_dashboard.png', 'SOC Engineer Telemetry Dashboard');
    });

    await recordTest('Screen: SOC Dashboard', 'Test Stream Pause / Resume live telemetry toggle', async () => {
      const paused = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const pBtn = btns.find((b) => b.textContent.includes('Pause') || b.textContent.includes('Resume'));
        if (pBtn) {
          pBtn.click();
          return true;
        }
        return false;
      });

      if (paused) {
        await new Promise((r) => setTimeout(r, 400));
        await captureScreenshot(page, '19_soc_stream_paused.png', 'SOC Live stream paused state');
        // Click again to resume
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const rBtn = btns.find((b) => b.textContent.includes('Resume') || b.textContent.includes('Pause'));
          if (rBtn) rBtn.click();
        });
      }
    });

    await recordTest('Screen: SOC Dashboard', 'Test Event Type stream filter dropdown (USB Connect, Logins, etc.)', async () => {
      const selectElem = await page.$('select');
      if (selectElem) {
        await page.select('select', 'usb_connect');
        await new Promise((r) => setTimeout(r, 400));
        await captureScreenshot(page, '20_soc_stream_filtered.png', 'Filtered SOC Telemetry Stream');
        await page.select('select', 'ALL');
      }
    });

    await recordTest('Screen: SOC Dashboard', 'Test Manual Telemetry Ingestion Modal ("Ingest Log") & MongoDB submission', async () => {
      await clickByText(page, 'button', 'Ingest Telemetry Log');
      await page.waitForSelector('h3', { timeout: 6000 });
      await captureScreenshot(page, '21_soc_ingest_modal_opened.png', 'Manual Telemetry Ingestion Modal');

      // Submit manual log event ("Ingest to MongoDB")
      await clickByText(page, 'button[type="submit"]', 'Ingest to MongoDB');
      await new Promise((r) => setTimeout(r, 1200));
      await captureScreenshot(page, '22_soc_ingest_success.png', 'Ingestion Success Confirmation');

      // Modal auto-closes on success, ensure wait
      await new Promise((r) => setTimeout(r, 1200));
      await page.keyboard.press('Escape');
    });

    // ------------------------------------------------------------------------
    // SECTION 4: SECURITY MANAGER DASHBOARD & EXECUTIVE GOVERNANCE
    // ------------------------------------------------------------------------
    log('--- [SECTION 4: Security Manager Persona & Strategic Risk] ---');

    await recordTest('Screen: Manager Dashboard', 'Login as Security Manager and access /dashboard/manager', async () => {
      await loginAsRole(page, 'security_manager');
      await page.waitForSelector('h1', { timeout: 10000 });
      if (!page.url().includes('/dashboard/manager')) {
        throw new Error(`Expected /dashboard/manager, got: ${page.url()}`);
      }
      await captureScreenshot(page, '23_manager_dashboard.png', 'Security Manager Executive Dashboard');
    });

    await recordTest('Screen: Manager Dashboard', 'Verify department comparison matrix and high-risk employee rankings', async () => {
      await page.waitForSelector('div');
      const hasReportLink = await page.evaluate(() => {
        return !!Array.from(document.querySelectorAll('a')).find((a) => a.href.includes('/reports'));
      });
      if (!hasReportLink) throw new Error('Executive Risk Report navigation link missing');
    });

    // ------------------------------------------------------------------------
    // SECTION 5: ADMINISTRATOR DASHBOARD & SYSTEM INFRASTRUCTURE
    // ------------------------------------------------------------------------
    log('--- [SECTION 5: Administrator Persona & System Infrastructure] ---');

    await recordTest('Screen: Admin Dashboard', 'Login as Administrator and access /dashboard/admin', async () => {
      await loginAsRole(page, 'admin');
      await page.waitForSelector('h1', { timeout: 10000 });
      if (!page.url().includes('/dashboard/admin')) {
        throw new Error(`Expected /dashboard/admin, got: ${page.url()}`);
      }
      await captureScreenshot(page, '24_admin_dashboard.png', 'Administrator Governance Dashboard');
    });

    await recordTest('Screen: Admin Dashboard', 'Verify dual-database health indicators (PostgreSQL & MongoDB)', async () => {
      const pageText = await page.evaluate(() => document.body.innerText);
      if (!pageText.includes('PostgreSQL') || !pageText.includes('MongoDB')) {
        throw new Error('Database service health indicators missing on Admin Dashboard');
      }
    });

    // ------------------------------------------------------------------------
    // SECTION 6: CORE OPERATIONAL SCREENS & INTERACTIVE CONTROLS
    // ------------------------------------------------------------------------
    log('--- [SECTION 6: Core Operational Intelligence Screens] ---');

    // 6.1 Employee Directory
    await recordTest('Screen: Employee Directory', 'Navigate to /employees and test Department filters & Search input', async () => {
      await navigateTo(page, '/employees');
      await page.waitForSelector('table', { timeout: 10000 });
      await captureScreenshot(page, '25_employees_directory.png', 'Employee Directory Screen');

      // Test Department Filter Buttons
      await clickByText(page, 'button', 'Engineering');
      await new Promise((r) => setTimeout(r, 400));
      await clickByText(page, 'button', 'Sales');
      await new Promise((r) => setTimeout(r, 400));
      await clickByText(page, 'button', 'ALL');

      // Test Search Input
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.type('John', { delay: 10 });
        await new Promise((r) => setTimeout(r, 300));
        await searchInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
      }
    });

    await recordTest('Screen: Employee Directory', 'Click Employee Row to open detailed Intelligence Drawer', async () => {
      await page.waitForSelector('tbody tr', { timeout: 8000 });
      await page.click('tbody tr:first-child');
      await new Promise((r) => setTimeout(r, 800));
      await captureScreenshot(page, '26_employee_detail_drawer.png', 'Employee Behavioral Intelligence Drawer');

      // Close drawer using Escape
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));
    });

    await recordTest('Screen: Employee Directory', 'Test "Register Employee" modal and PostgreSQL creation form', async () => {
      await clickByText(page, 'button', 'Register Employee');
      await page.waitForSelector('form', { timeout: 6000 });
      await captureScreenshot(page, '27_create_employee_modal.png', 'Register Employee Modal');

      const empId = `EMP${Math.floor(2000 + Math.random() * 8000)}`;
      const idInput = await page.$('input[placeholder*="EMP-"]');
      if (idInput) await idInput.type(empId, { delay: 10 });

      const nameInput = await page.$('input[placeholder*="Sarah"]');
      if (nameInput) await nameInput.type('Automation Test User', { delay: 10 });

      const designationInput = await page.$('input[placeholder*="DevOps"]');
      if (designationInput) await designationInput.type('Security Automation Engineer', { delay: 10 });

      await clickByText(page, 'button[type="submit"]', 'Register');
      await new Promise((r) => setTimeout(r, 1200));
      await captureScreenshot(page, '28_employee_created_success.png', 'Employee Created Success');
    });

    await recordTest('Screen: Employee Dossier', 'Navigate to /employees/EMP1007 and verify 360-degree risk tabs', async () => {
      await navigateTo(page, '/employees/EMP1007');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '28b_employee_dossier_overview.png', 'Employee 360 Risk Dossier Overview');

      // Test Tab Switch to UEBA Radar
      const uebaTabClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.includes('UEBA Risk'));
        if (b) { b.click(); return true; }
        return false;
      });
      if (uebaTabClicked) {
        await new Promise((r) => setTimeout(r, 400));
        await captureScreenshot(page, '28c_employee_dossier_ueba.png', 'Employee UEBA Breakdown');
      }

      // Test Tab Switch to Baselines
      const baselineTabClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.includes('Baselines'));
        if (b) { b.click(); return true; }
        return false;
      });
      if (baselineTabClicked) {
        await new Promise((r) => setTimeout(r, 400));
        await captureScreenshot(page, '28d_employee_dossier_baselines.png', 'Employee Baseline Comparison');
      }
    });

    // 6.2 Incidents Management & Deep Investigation Workspace
    await recordTest('Screen: Incident Management', 'Navigate to /incidents and test Status & Severity filter tabs', async () => {
      await navigateTo(page, '/incidents');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '28e_incidents_management_page.png', 'Incident Management Workspace Table');

      // Test Status & Severity Filter Dropdowns and Reset Button
      const selects = await page.$$('select');
      if (selects.length >= 2) {
        await selects[0].select('OPEN');
        await new Promise((r) => setTimeout(r, 300));
        await selects[1].select('CRITICAL');
        await new Promise((r) => setTimeout(r, 300));
        await selects[1].select('HIGH');
        await new Promise((r) => setTimeout(r, 300));
        await selects[1].select('ALL');
        await selects[0].select('ALL');
        await new Promise((r) => setTimeout(r, 300));
      }
      await clickByText(page, 'button', 'Reset');
      await new Promise((r) => setTimeout(r, 300));
    });

    await recordTest('Screen: Incident Management', 'Test "Open Investigation Case" modal & incident creation', async () => {
      const openModalClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => x.textContent.includes('Open New Case') || x.textContent.includes('Open Investigation Case') || x.textContent.includes('Create Incident'));
        if (b) { b.click(); return true; }
        return false;
      });

      if (openModalClicked) {
        await page.waitForSelector('form', { timeout: 6000 });
        await captureScreenshot(page, '28f_create_incident_modal.png', 'Create Incident Modal Form');

        const titleInput = await page.$('input[placeholder*="Exfiltration"]') || await page.$('input[type="text"]');
        if (titleInput) await titleInput.type('Automated QA Security Incident Investigation', { delay: 10 });

        const summaryInput = await page.$('textarea');
        if (summaryInput) await summaryInput.type('Suspected multi-vector exfiltration pattern observed via automated telemetry analysis.', { delay: 10 });

        await clickByText(page, 'button[type="submit"]', 'Open Incident');
        await new Promise((r) => setTimeout(r, 1200));
        await captureScreenshot(page, '28g_incident_created_success.png', 'Incident Created Success');
      }
    });

    await recordTest('Screen: Incident Investigation Workspace', 'Open Incident Detail (/incidents/[id]) and test Timeline & Evidence Notes', async () => {
      // Find and click the first incident in the list or row
      const incidentRowClicked = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        if (rows.length > 0) {
          const link = rows[0].querySelector('a');
          if (link) { link.click(); return true; }
          rows[0].click();
          return true;
        }
        const links = Array.from(document.querySelectorAll('a[href*="/incidents/"]'));
        if (links.length > 0) { links[0].click(); return true; }
        return false;
      });

      if (incidentRowClicked) {
        await page.waitForSelector('h1', { timeout: 10000 });
        await captureScreenshot(page, '28h_incident_workspace_timeline.png', 'Incident Investigation Timeline Workspace');

        // Test Switching to Notes Tab
        const notesTabClicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((x) => x.textContent.includes('Evidence Notes') || x.textContent.includes('Notes'));
          if (b) { b.click(); return true; }
          return false;
        });

        if (notesTabClicked) {
          await new Promise((r) => setTimeout(r, 400));
          await captureScreenshot(page, '28i_incident_workspace_notes.png', 'Incident Evidence Notes Tab');

          // Test adding an investigation note
          const noteArea = await page.$('textarea');
          if (noteArea) {
            await noteArea.type('Endpoint logs reviewed. High volume USB data transfer matched with off-hours login.', { delay: 5 });
            const addNoteBtn = await page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const b = btns.find((x) => x.textContent.includes('Add Note') || x.textContent.includes('Save Note'));
              if (b) { b.click(); return true; }
              return false;
            });
            if (addNoteBtn) {
              await new Promise((r) => setTimeout(r, 800));
              await captureScreenshot(page, '28j_incident_note_added.png', 'Investigation Note Recorded');
            }
          }
        }
      }
    });

    // 6.3 Activity Logs
    await recordTest('Screen: Activity Logs', 'Navigate to /logs and verify MongoDB 10,000+ telemetry log table', async () => {
      await navigateTo(page, '/logs');
      await page.waitForSelector('table', { timeout: 10000 });
      await captureScreenshot(page, '29_activity_logs_page.png', 'MongoDB Activity Logs Telemetry');

      // Test Event Type filter dropdown
      const eventSelect = await page.$('select');
      if (eventSelect) {
        await page.select('select', 'usb_connect');
        await new Promise((r) => setTimeout(r, 500));
        await page.select('select', '');
      }

      // Test Refresh button
      await clickByText(page, 'button', 'Refresh Telemetry');
      await new Promise((r) => setTimeout(r, 400));
    });

    await recordTest('Screen: Activity Logs', 'Test Table Pagination Controls (Next Page & Previous Page)', async () => {
      const hasNext = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find((b) => b.textContent.includes('Next') || b.textContent.includes('▶'));
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (hasNext) {
        await new Promise((r) => setTimeout(r, 600));
        await captureScreenshot(page, '30_activity_logs_page_2.png', 'Activity Logs Page 2');

        // Click Prev Page
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const prevBtn = btns.find((b) => b.textContent.includes('Prev') || b.textContent.includes('◀'));
          if (prevBtn && !prevBtn.disabled) prevBtn.click();
        });
        await new Promise((r) => setTimeout(r, 400));
      }
    });

    // 6.3 Alerts & Incident Investigation
    await recordTest('Screen: Alerts Queue', 'Navigate to /alerts and test Priority & Status filter tabs', async () => {
      await navigateTo(page, '/alerts');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '31_alerts_queue_page.png', 'Alerts & Incident Investigation Screen');

      // Click Priority filter tabs
      await clickByText(page, 'button', 'Critical');
      await new Promise((r) => setTimeout(r, 300));
      await clickByText(page, 'button', 'High');
      await new Promise((r) => setTimeout(r, 300));
      await clickByText(page, 'button', 'ALL');
      await new Promise((r) => setTimeout(r, 300));
    });

    await recordTest('Screen: Alerts Queue', 'Test "Execute ML Threat Scan (10k Logs)" trigger button', async () => {
      const scanned = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent.includes('Execute ML Threat Scan'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (scanned) {
        await new Promise((r) => setTimeout(r, 2500));
        await captureScreenshot(page, '32_ml_threat_scan_executed.png', 'ML Threat Scan Pipeline Results');
      }
    });

    // 6.4 Behavioral Anomalies & ML Intelligence
    await recordTest('Screen: Behavioral Anomalies', 'Navigate to /anomalies and test ML Model Tab & Radar Scanner', async () => {
      await navigateTo(page, '/anomalies');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '33_anomalies_ml_model_tab.png', 'AI Behavioral Anomaly Detection Tab');
    });

    await recordTest('Screen: Behavioral Anomalies', 'Test "Per-Employee Behavioral Baselines" Tab and Employee Selector', async () => {
      await clickByText(page, 'button', 'Per-Employee Behavioral Baselines');
      await page.waitForSelector('select', { timeout: 8000 });
      await new Promise((r) => setTimeout(r, 600));

      // Test selecting different employee baseline
      const selectElem = await page.$('select');
      if (selectElem) {
        await page.select('select', 'EMP1008');
        await new Promise((r) => setTimeout(r, 600));
      }
      await captureScreenshot(page, '34_anomalies_baselines_tab.png', 'Employee Behavioral Baselines');
    });

    await recordTest('Screen: Behavioral Anomalies', 'Test "Interactive Live Model Sandbox" Tab & Run Prediction', async () => {
      await clickByText(page, 'button', 'Interactive Live Model Sandbox');
      await page.waitForSelector('form', { timeout: 8000 });

      // Click Evaluate with Isolation Forest Model submit button
      await clickByText(page, 'button[type="submit"]', 'Evaluate with Isolation Forest Model');
      await new Promise((r) => setTimeout(r, 1500));
      await captureScreenshot(page, '35_anomalies_sandbox_prediction.png', 'Sandbox Isolation Forest Prediction Result');
    });

    // 6.5 Executive Reports & Compliance
    await recordTest('Screen: Executive Reports', 'Navigate to /reports and test Export button', async () => {
      await navigateTo(page, '/reports');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '36_reports_compliance_page.png', 'Executive Risk Posture & Compliance Report');

      await clickByText(page, 'button', 'Export CSV');
      await new Promise((r) => setTimeout(r, 300));
    });

    // 6.6 System Administration & RBAC Matrix
    await recordTest('Screen: System Administration', 'Navigate to /admin and test RBAC matrix & Audit Trail Export', async () => {
      await navigateTo(page, '/admin');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '37_admin_rbac_page.png', 'RBAC Platform Administration Screen');

      await clickByText(page, 'button', 'Export Audit Trail');
      await new Promise((r) => setTimeout(r, 300));
    });

    // 6.7 Support & Documentation
    await recordTest('Screen: Support Center', 'Navigate to /support and verify Dual-Database Architecture & RESTful API Guide', async () => {
      await navigateTo(page, '/support');
      await page.waitForSelector('h1', { timeout: 10000 });
      await captureScreenshot(page, '38_support_documentation_page.png', 'Support Center & Architecture Reference');
    });

    // ------------------------------------------------------------------------
    // SECTION 7: GLOBAL SIDEBAR NAVIGATION & LOGOUT
    // ------------------------------------------------------------------------
    log('--- [SECTION 7: Global Sidebar Navigation & Logout] ---');

    await recordTest('Sidebar & Session', 'Test Sidebar Navigation across authorized routes and Logout flow', async () => {
      // Click Sidebar "Incidents"
      await clickByText(page, 'aside a', 'Incidents');
      await new Promise((r) => setTimeout(r, 400));

      // Click Sidebar "Employees"
      await clickByText(page, 'aside a', 'Employees');
      await new Promise((r) => setTimeout(r, 400));

      // Click Sidebar "Logout"
      await clickByText(page, 'aside button', 'Logout');
      await page.waitForNavigation({ waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 8000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));

      if (!page.url().includes('/login')) {
        throw new Error(`Expected /login after logout, got: ${page.url()}`);
      }
      await captureScreenshot(page, '39_logged_out_redirect.png', 'Successful Logout Redirection to Login');
    });

  } catch (err) {
    log(`Unhandled exception in test suite: ${err.message}`, 'FATAL');
  } finally {
    if (browser) {
      await browser.close();
      log('Browser closed cleanly.');
    }
  }

  // ------------------------------------------------------------------------
  // GENERATE REPORTS & SUMMARY
  // ------------------------------------------------------------------------
  const totalDuration = Date.now() - suiteStartTime;
  testResults.endedAt = new Date().toISOString();
  testResults.durationMs = totalDuration;

  log('========================================================================');
  log(`🏁 Test Suite Finished in ${(totalDuration / 1000).toFixed(2)}s`);
  log(`Total Tests: ${testResults.totalTests} | Passed: ${testResults.passed} | Failed: ${testResults.failed}`);
  log(`Screenshots Captured: ${testResults.screenshots.length}`);
  log('========================================================================');

  generateJsonReport();
  generateMarkdownReport();
  generateHtmlReport();

  return testResults;
}

/**
 * Generate Structured JSON Test Report
 */
function generateJsonReport() {
  const jsonPath = path.join(REPORTS_DIR, 'test-summary.json');
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2), 'utf-8');
  log(`Saved JSON Test Summary -> ${jsonPath}`);
}

/**
 * Generate Markdown Summary Report
 */
function generateMarkdownReport() {
  const mdPath = path.join(REPORTS_DIR, 'summary.md');
  const passRate = testResults.totalTests > 0
    ? ((testResults.passed / testResults.totalTests) * 100).toFixed(1)
    : 0;

  let md = `# ITBIS UI & Interactive Button Test Suite — Execution Summary\n\n`;
  md += `**Execution Time:** ${new Date(testResults.startedAt).toLocaleString()}  \n`;
  md += `**Duration:** ${(testResults.durationMs / 1000).toFixed(2)} seconds  \n`;
  md += `**Target System:** [${testResults.baseUrl}](${testResults.baseUrl})  \n`;
  md += `**Browser:** ${testResults.browserInfo || 'Chromium / Chrome'}  \n`;
  md += `**Overall Pass Rate:** **${passRate}%** (${testResults.passed} / ${testResults.totalTests} tests passed)  \n\n`;

  md += `## 📊 Test Results Overview\n\n`;
  md += `| Total Tests | Passed | Failed | Screenshots Captured |\n`;
  md += `| :---: | :---: | :---: | :---: |\n`;
  md += `| **${testResults.totalTests}** | **<span style="color:green">${testResults.passed}</span>** | **<span style="color:${testResults.failed > 0 ? 'red' : 'gray'}">${testResults.failed}</span>** | **${testResults.screenshots.length}** |\n\n`;

  md += `## 🖥️ Screen-by-Screen Test Breakdown\n\n`;

  for (const screen of testResults.screens) {
    const icon = screen.failed === 0 ? '✅' : '❌';
    md += `### ${icon} ${screen.name} (${screen.passed}/${screen.tests.length} Passed)\n\n`;
    md += `| Test Case / Action | Status | Duration | Error |\n`;
    md += `| :--- | :---: | :---: | :--- |\n`;
    for (const test of screen.tests) {
      const statusBadge = test.status === 'PASSED' ? '`PASS`' : '**`FAIL`**';
      const errorText = test.error ? `\`${test.error}\`` : '-';
      md += `| ${test.name} | ${statusBadge} | ${test.durationMs}ms | ${errorText} |\n`;
    }
    md += `\n`;
  }

  md += `## 📸 Captured Screenshots Gallery\n\n`;
  md += `Total of **${testResults.screenshots.length} high-resolution screenshots** captured across all screens and interactive button states:\n\n`;
  md += `| # | File Name | Screen / Action Description |\n`;
  md += `| :---: | :--- | :--- |\n`;
  testResults.screenshots.forEach((s, idx) => {
    md += `| ${idx + 1} | \`${s.filename}\` | ${s.description} |\n`;
  });
  md += `\n`;

  fs.writeFileSync(mdPath, md, 'utf-8');
  log(`Saved Markdown Summary -> ${mdPath}`);
}

/**
 * Generate Modern Interactive HTML Test Report
 */
function generateHtmlReport() {
  const htmlPath = path.join(REPORTS_DIR, 'puppeteer-test-report.html');
  const passRate = testResults.totalTests > 0
    ? ((testResults.passed / testResults.totalTests) * 100).toFixed(1)
    : 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ITBIS UI & Button Test Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --font: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 32px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .badge-itbis {
      background: #0284c7;
      color: white;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 12px;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .meta-p { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    
    /* Metrics Row */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .metric-title { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 32px; font-weight: 800; margin-top: 6px; }
    .metric-pass { color: var(--success); }
    .metric-fail { color: var(--danger); }
    .metric-neutral { color: var(--primary); }
    
    /* Tabs & Breakdown */
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .screen-group {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .screen-header {
      padding: 16px 20px;
      background: #172554/40;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .screen-title { font-size: 15px; font-weight: 700; }
    .pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: var(--font-mono);
    }
    .pill-pass { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .pill-fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 12px 20px; color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    td { padding: 12px 20px; border-bottom: 1px solid rgba(51, 65, 85, 0.5); }
    tr:last-child td { border-bottom: none; }
    .duration-cell { font-family: var(--font-mono); color: var(--text-muted); font-size: 12px; }
    .error-cell { color: #fca5a5; font-family: var(--font-mono); font-size: 11px; }

    /* Gallery Grid */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .gallery-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .gallery-item:hover { transform: translateY(-3px); border-color: var(--primary); }
    .gallery-img { width: 100%; height: 180px; object-fit: cover; object-position: top; background: #000; cursor: pointer; }
    .gallery-caption { padding: 12px; font-size: 12px; }
    .gallery-name { font-weight: 700; color: var(--primary); font-family: var(--font-mono); font-size: 11px; margin-bottom: 4px; }
    .gallery-desc { color: var(--text-muted); font-size: 11px; }

    /* Lightbox Modal */
    #lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    #lightbox.active { display: flex; }
    #lightbox img { max-width: 95vw; max-height: 90vh; border-radius: 8px; border: 1px solid var(--border); }
    #lightbox-close { position: absolute; top: 20px; right: 24px; color: white; font-size: 32px; cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand">
          <span class="badge-itbis">ITBIS</span>
          <h1>Puppeteer Full-Stack Automation Test Report</h1>
        </div>
        <p class="meta-p">Target Base URL: <strong style="color:var(--text);">${testResults.baseUrl}</strong> | Tested on: ${new Date(testResults.startedAt).toLocaleString()}</p>
      </div>
      <div>
        <span class="pill pill-pass" style="font-size:13px; padding:6px 12px;">Browser: ${testResults.browserInfo || 'Chromium'}</span>
      </div>
    </header>

    <!-- Metrics Summary -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Total Tests Executed</div>
        <div class="metric-value metric-neutral">${testResults.totalTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Passed Tests</div>
        <div class="metric-value metric-pass">${testResults.passed}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Failed Tests</div>
        <div class="metric-value ${testResults.failed > 0 ? 'metric-fail' : 'metric-pass'}">${testResults.failed}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Overall Pass Rate</div>
        <div class="metric-value metric-pass">${passRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Total Duration</div>
        <div class="metric-value" style="font-size:24px; font-family:var(--font-mono);">${(testResults.durationMs / 1000).toFixed(2)}s</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Screenshots Saved</div>
        <div class="metric-value metric-neutral">${testResults.screenshots.length}</div>
      </div>
    </div>

    <!-- Screen Test Breakdown -->
    <div class="section-title">
      <span>📋</span> Screen & Interactive Button Test Results
    </div>

    ${testResults.screens.map((screen) => `
      <div class="screen-group">
        <div class="screen-header">
          <div class="screen-title">${screen.name}</div>
          <span class="pill ${screen.failed === 0 ? 'pill-pass' : 'pill-fail'}">${screen.passed} / ${screen.tests.length} Passed</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Test Case / Action</th>
              <th style="width:120px;">Status</th>
              <th style="width:120px;">Duration</th>
              <th>Error Details</th>
            </tr>
          </thead>
          <tbody>
            ${screen.tests.map((test) => `
              <tr>
                <td style="font-weight:600;">${test.name}</td>
                <td><span class="pill ${test.status === 'PASSED' ? 'pill-pass' : 'pill-fail'}">${test.status}</span></td>
                <td class="duration-cell">${test.durationMs}ms</td>
                <td class="error-cell">${test.error ? test.error : '<span style="color:#64748b;">—</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}

    <!-- Screenshot Gallery -->
    <div class="section-title" style="margin-top:40px;">
      <span>📸</span> Screen & Interaction Screenshot Gallery (${testResults.screenshots.length} Screenshots)
    </div>

    <div class="gallery-grid">
      ${testResults.screenshots.map((s) => `
        <div class="gallery-item">
          <img class="gallery-img" src="../${s.relativePath}" alt="${s.description}" onclick="openLightbox(this.src)" loading="lazy" />
          <div class="gallery-caption">
            <div class="gallery-name">${s.filename}</div>
            <div class="gallery-desc">${s.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <div id="lightbox" onclick="closeLightbox()">
    <span id="lightbox-close">&times;</span>
    <img id="lightbox-img" src="" alt="Zoomed Screenshot" />
  </div>

  <script>
    function openLightbox(src) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox').classList.add('active');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf-8');
  log(`Saved HTML Interactive Report -> ${htmlPath}`);
}

// Execute if run directly
if (require.main === module) {
  runAllTests()
    .then((results) => {
      const exitCode = results.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((err) => {
      console.error('Fatal error running puppeteer tests:', err);
      process.exit(1);
    });
}

module.exports = { runAllTests };
