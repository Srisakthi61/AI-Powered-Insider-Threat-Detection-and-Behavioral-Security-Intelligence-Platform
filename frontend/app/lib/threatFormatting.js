/**
 * User-Friendly Copy & Threat Formatting Utilities
 * Translates technical terminology, ML jargon, internal IDs, and raw JSON
 * into clean, intuitive security terminology for normal operators and users.
 */

// Canonical user-friendly threat names and descriptions
export const THREAT_DEFINITIONS = {
  USB_COPY: {
    title: "Large File Copy to USB",
    description: "6.5 GB of company data was copied to a USB device.",
  },
  UNAUTHORIZED_ADMIN: {
    title: "Unauthorized Admin Access",
    description: "An attempt was made to gain higher system access.",
  },
  UNUSUAL_LOGIN: {
    title: "Unusual Login Attempts",
    description: "Multiple login attempts were detected at an unusual time.",
  },
  LARGE_EXTERNAL_TRANSFER: {
    title: "Large External Data Transfer",
    description: "A large amount of company data was sent outside the organization.",
  },
  UNUSUAL_ACTIVITY: {
    title: "Unusual Activity Detected",
    description: "The employee's recent activity is significantly different from their normal activity pattern.",
  },
};

/**
 * Format raw threat names / alert messages / incident titles to clean user-friendly labels.
 * Strips [ML Anomaly], [ML Model], [Simulated Incident], Isolation Forest, etc.
 */
export function formatThreatTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") {
    return THREAT_DEFINITIONS.UNUSUAL_ACTIVITY.title;
  }

  const lower = rawTitle.toLowerCase();

  if (
    lower.includes("usb") ||
    lower.includes("sandisk") ||
    lower.includes("flash") ||
    lower.includes("mass_usb")
  ) {
    return THREAT_DEFINITIONS.USB_COPY.title;
  }

  if (
    lower.includes("sudo") ||
    lower.includes("privilege") ||
    lower.includes("escalation") ||
    lower.includes("root") ||
    lower.includes("unauthorized admin")
  ) {
    return THREAT_DEFINITIONS.UNAUTHORIZED_ADMIN.title;
  }

  if (
    lower.includes("mfa") ||
    lower.includes("brute") ||
    lower.includes("off_hours") ||
    lower.includes("off-hours") ||
    lower.includes("login drift") ||
    lower.includes("03:15") ||
    lower.includes("unusual login")
  ) {
    return THREAT_DEFINITIONS.UNUSUAL_LOGIN.title;
  }

  if (
    lower.includes("egress") ||
    lower.includes("cloud") ||
    lower.includes("sftp") ||
    lower.includes("external dump") ||
    lower.includes("data transfer") ||
    lower.includes("bulk_egress") ||
    lower.includes("large external")
  ) {
    return THREAT_DEFINITIONS.LARGE_EXTERNAL_TRANSFER.title;
  }

  if (
    lower.includes("isolation forest") ||
    lower.includes("ml model") ||
    lower.includes("ml anomaly") ||
    lower.includes("statistical deviation") ||
    lower.includes("multi-indicator") ||
    lower.includes("outlier")
  ) {
    return THREAT_DEFINITIONS.UNUSUAL_ACTIVITY.title;
  }

  // If already clean, strip technical prefixes if any
  const cleaned = rawTitle
    .replace(/^\[(ML Anomaly|ML Model|Simulated Incident|Sandbox Evaluation)\]\s*/gi, "")
    .replace(/Isolation Forest/gi, "Behavior Analysis")
    .trim();

  return cleaned || THREAT_DEFINITIONS.UNUSUAL_ACTIVITY.title;
}

/**
 * Format threat description / details to clean, human-readable explanations.
 */
export function formatThreatDescription(rawTitleOrMsg, rawDetails) {
  const lowerTitle = (rawTitleOrMsg || "").toLowerCase();
  const lowerDetails = (typeof rawDetails === "string" ? rawDetails : JSON.stringify(rawDetails || "")).toLowerCase();

  if (
    lowerTitle.includes("usb") ||
    lowerTitle.includes("sandisk") ||
    lowerDetails.includes("usb") ||
    lowerDetails.includes("sandisk")
  ) {
    return THREAT_DEFINITIONS.USB_COPY.description;
  }

  if (
    lowerTitle.includes("sudo") ||
    lowerTitle.includes("privilege") ||
    lowerTitle.includes("escalation") ||
    lowerDetails.includes("sudo") ||
    lowerDetails.includes("privilege")
  ) {
    return THREAT_DEFINITIONS.UNAUTHORIZED_ADMIN.description;
  }

  if (
    lowerTitle.includes("mfa") ||
    lowerTitle.includes("brute") ||
    lowerTitle.includes("off_hours") ||
    lowerTitle.includes("login drift") ||
    lowerDetails.includes("mfa") ||
    lowerDetails.includes("brute")
  ) {
    return THREAT_DEFINITIONS.UNUSUAL_LOGIN.description;
  }

  if (
    lowerTitle.includes("egress") ||
    lowerTitle.includes("cloud") ||
    lowerTitle.includes("sftp") ||
    lowerDetails.includes("egress") ||
    lowerDetails.includes("external")
  ) {
    return THREAT_DEFINITIONS.LARGE_EXTERNAL_TRANSFER.description;
  }

  if (
    lowerTitle.includes("isolation forest") ||
    lowerTitle.includes("ml model") ||
    lowerTitle.includes("ml anomaly") ||
    lowerTitle.includes("statistical deviation") ||
    lowerTitle.includes("multi-indicator") ||
    lowerTitle.includes("outlier") ||
    lowerDetails.includes("anomaly score") ||
    lowerDetails.includes("multi-indicator")
  ) {
    return "The employee's recent activity is significantly different from their normal behavior.";
  }

  // If rawDetails is a simple text string without technical score metadata
  if (
    rawDetails &&
    typeof rawDetails === "string" &&
    !rawDetails.includes("Anomaly Score") &&
    !rawDetails.includes("Outlier:") &&
    !rawDetails.startsWith("{") &&
    rawDetails.trim().length > 5
  ) {
    return rawDetails
      .replace(/^\[(ML Anomaly|ML Model|Simulated Incident)\]\s*/gi, "")
      .trim();
  }

  return "The employee's recent activity is significantly different from their normal behavior.";
}

/**
 * Format activity log event types to user-friendly labels.
 * file_upload -> File Upload
 * file_download -> File Download
 * login -> Login
 * email_activity -> Email Activity
 * data_transfer -> Data Transfer
 * usb_connect -> USB Device Connected
 * privilege_change -> Admin Access Change
 */
export function formatEventType(eventType) {
  if (!eventType) return "Activity";
  const normalized = String(eventType).toLowerCase().trim();

  switch (normalized) {
    case "file_upload":
      return "File Upload";
    case "file_download":
      return "File Download";
    case "login":
      return "Login";
    case "email_activity":
      return "Email Activity";
    case "data_transfer":
      return "Data Transfer";
    case "usb_connect":
      return "USB Device Connected";
    case "privilege_change":
      return "Admin Access Change";
    case "remote_access":
      return "Remote Access";
    case "rule_anomaly":
      return "Rule Anomaly";
    case "ml_anomaly":
      return "Unusual Activity";
    case "investigation_note":
      return "Investigation Note";
    case "incident":
      return "Incident Case";
    case "log":
      return "Activity Log";
    default:
      return normalized
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

/**
 * Format activity log risk flags to user-friendly labels.
 * mass_usb_exfiltration -> Large File Copy to USB
 * bulk_egress_exfiltration -> Large External Data Transfer
 * unauthorized_sudo_escalation -> Unauthorized Admin Access
 * off_hours_brute_force_attack -> Unusual Login Attempts
 * "Normal Activity" -> "Normal Activity"
 */
export function formatRiskFlag(riskFlag) {
  if (!riskFlag) return "Normal Activity";
  const normalized = String(riskFlag).toLowerCase().trim();

  switch (normalized) {
    case "mass_usb_exfiltration":
      return THREAT_DEFINITIONS.USB_COPY.title;
    case "bulk_egress_exfiltration":
      return THREAT_DEFINITIONS.LARGE_EXTERNAL_TRANSFER.title;
    case "unauthorized_sudo_escalation":
      return THREAT_DEFINITIONS.UNAUTHORIZED_ADMIN.title;
    case "off_hours_brute_force_attack":
      return THREAT_DEFINITIONS.UNUSUAL_LOGIN.title;
    case "normal_activity":
    case "normal activity":
    case "normal":
      return "Normal Activity";
    default:
      return formatThreatTitle(riskFlag);
  }
}

/**
 * Robust parser for JSON strings or Python dict strings with single quotes
 */
export function parseDictOrJson(input) {
  if (!input) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;

  let str = input.trim();
  if (str.startsWith("Details:")) {
    str = str.replace(/^Details:\s*/i, "").trim();
  }

  const jsonMatch = str.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    str = jsonMatch[0];
  } else {
    return null;
  }

  // 1. Try native JSON.parse
  try {
    return JSON.parse(str);
  } catch (e) {
    // 2. Try converting Python dict string to valid JSON
    try {
      const converted = str
        .replace(/None\b/g, "null")
        .replace(/True\b/g, "true")
        .replace(/False\b/g, "false")
        .replace(/'((?:\\.|[^'\\])*)'/g, '"$1"');
      return JSON.parse(converted);
    } catch (e2) {
      // 3. Regex extraction fallback
      const result = {};
      const pairRegex = /['"]?([a-zA-Z0-9_]+)['"]?\s*:\s*(['"]([^'"]*)['"]|([0-9.]+)|true|false|null)/gi;
      let m;
      while ((m = pairRegex.exec(str)) !== null) {
        const key = m[1];
        let val = m[3] !== undefined ? m[3] : m[2];
        if (val === "true") val = true;
        else if (val === "false") val = false;
        else if (val === "null") val = null;
        else if (!isNaN(Number(val)) && typeof val === "string" && val.trim() !== "") val = Number(val);
        result[key] = val;
      }
      if (Object.keys(result).length > 0) return result;
    }
  }
  return null;
}

/**
 * Extract structured, human-friendly key-value pairs from activity log details.
 * Prevents raw JSON output and displays structured information:
 * Destination: External storage
 * File size: 4.2 GB
 * File: Financial_Report.xlsx
 * Device: USB storage
 */
export function getActivityDetailPairs(details, eventType = "") {
  if (!details) return [{ label: "Activity", value: "Normal standard activity" }];

  let parsed = parseDictOrJson(details) || details;

  if (typeof parsed !== "object" || parsed === null) {
    return [{ label: "Details", value: String(parsed) }];
  }

  const pairs = [];

  // 1. Destination
  if (parsed.destination) {
    let destVal = String(parsed.destination);
    if (destVal.includes("external") || destVal.includes(".ru") || destVal.includes("s3")) {
      destVal = "External storage";
    } else if (destVal.includes("Internal/")) {
      destVal = "Internal repository";
    }
    pairs.push({ label: "Destination", value: destVal });
  }

  // 2. File size / Transferred MB / USB Total
  const sizeMb = parsed.file_size_mb || parsed.file_size || parsed.transferred_mb || parsed.usb_total_mb;
  if (sizeMb !== undefined && sizeMb !== null && sizeMb !== "") {
    const num = parseFloat(sizeMb);
    if (!isNaN(num) && num > 0) {
      const formattedSize = num >= 1000 ? `${(num / 1024).toFixed(1)} GB` : `${num.toFixed(1)} MB`;
      pairs.push({ label: "File size", value: formattedSize });
    }
  }

  // 3. File name
  if (parsed.file_name || parsed.file) {
    pairs.push({ label: "File", value: String(parsed.file_name || parsed.file) });
  }

  // 4. Device
  if (parsed.device || parsed.device_name) {
    let devVal = String(parsed.device || parsed.device_name);
    if (devVal.toLowerCase().includes("sandisk") || devVal.toLowerCase().includes("usb")) {
      devVal = "USB storage";
    }
    pairs.push({ label: "Device", value: devVal });
  }

  // 5. IP Address
  if (parsed.ip_address || parsed.ip) {
    pairs.push({ label: "IP Address", value: String(parsed.ip_address || parsed.ip) });
  }

  // 6. Location
  if (parsed.location) {
    pairs.push({ label: "Location", value: String(parsed.location) });
  }

  // 7. Command
  if (parsed.command) {
    pairs.push({ label: "Command", value: String(parsed.command) });
  }

  // 8. Status
  if (parsed.status) {
    let statusVal = String(parsed.status);
    if (statusVal === "failed_mfa_bruteforce") statusVal = "Failed MFA (Unusual Attempts)";
    else if (statusVal === "success") statusVal = "Success";
    else if (statusVal === "denied") statusVal = "Denied (Unauthorized)";
    pairs.push({ label: "Status", value: statusVal });
  }

  // 9. Attempt Count
  if (parsed.attempt_count) {
    pairs.push({ label: "Attempts", value: `${parsed.attempt_count} attempts` });
  }

  // 10. Protocol
  if (parsed.protocol) {
    pairs.push({ label: "Protocol", value: String(parsed.protocol) });
  }

  // 11. Recipient Count
  if (parsed.recipient_count) {
    pairs.push({ label: "Recipients", value: `${parsed.recipient_count} recipients` });
  }

  // 12. USB event count
  if (parsed.usb_event_count && !parsed.usb_total_mb) {
    pairs.push({ label: "USB Events", value: `${parsed.usb_event_count} connections` });
  }

  // Any other keys in details not already processed (skip internal identifiers)
  const handledKeys = new Set([
    "_id", "id", "risk_flag", "destination", "file_size_mb", "file_size",
    "transferred_mb", "usb_total_mb", "file_name", "file", "device",
    "device_name", "ip_address", "ip", "location", "command", "status",
    "attempt_count", "protocol", "recipient_count", "usb_event_count",
    "is_simulation", "timestamp"
  ]);

  for (const [key, val] of Object.entries(parsed)) {
    if (!handledKeys.has(key) && val !== undefined && val !== null && val !== "") {
      const cleanKey = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const cleanVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      pairs.push({ label: cleanKey, value: cleanVal });
    }
  }

  if (pairs.length === 0) {
    pairs.push({ label: "Activity", value: "Normal monitored employee activity" });
  }

  return pairs;
}

/**
 * Convert raw JSON activity metadata into clean, user-friendly sentences or strings.
 */
export function formatActivityDetails(details, eventType = "") {
  if (!details) return "Normal standard activity.";

  // If already a clean string and doesn't look like JSON
  if (typeof details === "string" && !details.trim().startsWith("{")) {
    return details;
  }

  const pairs = getActivityDetailPairs(details, eventType);
  return pairs.map((p) => `${p.label}: ${p.value}`).join(" • ");
}

/**
 * Format incident timeline entries into human-friendly headlines and structured attributes.
 * Prevents raw Python dicts/JSON strings like {'file_name':'schema.sql',...} from being shown.
 */
export function formatHumanTimelineActivity(item) {
  if (!item) return { headline: "Activity recorded", attributes: [] };

  const parsed =
    parseDictOrJson(item.description) ||
    (typeof item.meta === "object" && item.meta !== null ? item.meta : null) ||
    (typeof item.metadata === "object" && item.metadata !== null ? item.metadata : null) ||
    {};

  const title = (item.title || "").toLowerCase();
  const eventType = (item.event_type || item.source || "").toLowerCase();
  const attributes = [];
  let headline = "";

  // 1. Determine clean, natural language headline
  if (eventType.includes("file_upload") || title.includes("file upload")) {
    headline = parsed.file_name ? `File uploaded: ${parsed.file_name}` : "File uploaded";
  } else if (eventType.includes("file_download") || title.includes("file download")) {
    headline = parsed.file_name ? `File downloaded: ${parsed.file_name}` : "File downloaded";
  } else if (eventType.includes("login") || title.includes("login")) {
    if (parsed.status === "success") {
      headline = "Login successful";
    } else if (
      (parsed.status && (parsed.status.includes("fail") || parsed.status.includes("mfa"))) ||
      title.includes("brute")
    ) {
      headline = "Login failed (unusual attempts detected)";
    } else {
      headline = "User login recorded";
    }
  } else if (eventType.includes("usb") || title.includes("usb")) {
    headline = parsed.device_name ? `USB device connected: ${parsed.device_name}` : "USB device connected";
  } else if (eventType.includes("privilege") || title.includes("privilege") || title.includes("sudo")) {
    headline = parsed.command ? `Admin command: ${parsed.command}` : "Privileged command executed";
  } else if (eventType.includes("remote") || title.includes("remote") || title.includes("vpn")) {
    headline = `Remote access session (${parsed.protocol || "VPN"})`;
  } else if (eventType.includes("email") || title.includes("email")) {
    headline = "Outbound email activity";
  } else if (eventType.includes("transfer") || title.includes("transfer")) {
    headline = "Data transfer session";
  } else if (item.title) {
    headline = formatThreatTitle(item.title);
  }

  // 2. Extract structured human-readable attributes
  if (parsed.device || parsed.device_name) {
    let dev = String(parsed.device || parsed.device_name);
    attributes.push({ label: "Device", value: dev });
  }

  const sizeMb = parsed.file_size_mb || parsed.file_size || parsed.transferred_mb || parsed.usb_total_mb;
  if (sizeMb !== undefined && sizeMb !== null && sizeMb !== "") {
    const num = parseFloat(sizeMb);
    if (!isNaN(num)) {
      const formatted = num >= 1024 ? `${(num / 1024).toFixed(2)} GB` : `${num} MB`;
      attributes.push({ label: "Size", value: formatted });
    }
  }

  if (parsed.destination || parsed.destination_path) {
    let dest = String(parsed.destination || parsed.destination_path);
    dest = dest.replace(/^Internal\//, "").replace(/_/g, " ");
    attributes.push({ label: "Destination", value: dest });
  }

  if (parsed.source) {
    let src = String(parsed.source).replace(/_/g, " ");
    attributes.push({ label: "Source", value: src });
  }

  if (parsed.ip_address || parsed.ip) {
    attributes.push({ label: "IP address", value: String(parsed.ip_address || parsed.ip) });
  }

  if (parsed.location) {
    attributes.push({ label: "Location", value: String(parsed.location) });
  }

  if (parsed.command && !headline.includes(parsed.command)) {
    attributes.push({ label: "Command", value: String(parsed.command) });
  }

  if (parsed.status && !headline.toLowerCase().includes(parsed.status.toLowerCase())) {
    const st =
      parsed.status === "success"
        ? "Success"
        : parsed.status === "denied"
        ? "Denied (Unauthorized)"
        : parsed.status === "failed_mfa_bruteforce"
        ? "Failed MFA"
        : String(parsed.status);
    attributes.push({ label: "Status", value: st });
  }

  if (parsed.target_host) {
    attributes.push({ label: "Target Host", value: String(parsed.target_host) });
  }

  if (parsed.protocol) {
    attributes.push({ label: "Protocol", value: String(parsed.protocol) });
  }

  if (parsed.duration_min) {
    attributes.push({ label: "Duration", value: `${parsed.duration_min} min` });
  }

  if (parsed.attempt_count) {
    attributes.push({ label: "Attempts", value: String(parsed.attempt_count) });
  }

  if (parsed.file_count) {
    attributes.push({ label: "Files", value: `${parsed.file_count} files` });
  }

  if (parsed.recipient_domain) {
    attributes.push({ label: "Recipient Domain", value: String(parsed.recipient_domain) });
  }

  // If no headline was determined and no details, fall back to clean description
  if (!headline) {
    if (item.description && !item.description.includes("{")) {
      headline = item.description;
    } else {
      headline = "Security activity recorded";
    }
  }

  return { headline, attributes };
}


