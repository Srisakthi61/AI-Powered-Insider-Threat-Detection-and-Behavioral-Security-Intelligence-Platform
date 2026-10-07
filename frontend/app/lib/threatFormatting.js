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

  return THREAT_DEFINITIONS.UNUSUAL_ACTIVITY.description;
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
 * Convert raw JSON activity metadata into clean, user-friendly sentences.
 */
export function formatActivityDetails(details, eventType = "") {
  if (!details) return "Normal standard activity.";

  // If already a clean readable string (not stringified JSON)
  if (typeof details === "string") {
    if (details.trim().startsWith("{")) {
      try {
        details = JSON.parse(details);
      } catch {
        return details;
      }
    } else {
      return details;
    }
  }

  if (typeof details !== "object") {
    return String(details);
  }

  // 1. High-priority risk scenarios
  const riskFlag = (details.risk_flag || "").toLowerCase();
  if (riskFlag.includes("mass_usb") || riskFlag.includes("usb_exfiltration")) {
    return "USB device connected and a large amount of data was copied.";
  }
  if (riskFlag.includes("bulk_egress") || riskFlag.includes("cloud_data_dump")) {
    return "Large data transfer to an external storage location.";
  }
  if (riskFlag.includes("unauthorized_sudo") || riskFlag.includes("sudo_privilege")) {
    return "Unauthorized admin access attempt.";
  }
  if (riskFlag.includes("off_hours") || riskFlag.includes("brute_force")) {
    return "Unusual login attempts outside normal working hours.";
  }

  // 2. Specific event details inspection
  const ev = String(eventType).toLowerCase();

  // USB
  if (ev === "usb_connect" || details.device_name || details.usb_total_mb) {
    const mb = details.transferred_mb || details.usb_total_mb;
    if (mb && parseFloat(mb) > 500) {
      return "USB device connected and a large amount of data was copied.";
    }
    const dev = details.device_name ? ` (${details.device_name})` : "";
    return `USB device connected${dev}.`;
  }

  // Privilege change
  if (
    ev === "privilege_change" ||
    String(details.command || "").toLowerCase().includes("sudo") ||
    details.status === "denied"
  ) {
    if (details.status === "denied" || String(details.command || "").includes("/etc/shadow")) {
      return "Unauthorized admin access attempt.";
    }
    return "Admin privilege setting change request.";
  }

  // Login
  if (ev === "login" || details.status === "failed_mfa_bruteforce" || details.attempt_count > 5) {
    if (details.status === "failed_mfa_bruteforce" || details.attempt_count > 5) {
      return "Unusual login attempts outside normal working hours.";
    }
    if (details.status === "failed" || details.status === "denied") {
      return "Failed system login attempt.";
    }
    const ip = details.ip_address ? ` from IP ${details.ip_address}` : "";
    return `User logged into system${ip}.`;
  }

  // External Data Transfer / File Upload
  if (ev === "data_transfer" || details.destination || details.protocol === "SFTP") {
    const mb = details.transferred_mb;
    if (
      String(details.destination || "").includes("external") ||
      String(details.destination || "").includes(".ru") ||
      (mb && parseFloat(mb) > 1000)
    ) {
      return "Large data transfer to an external storage location.";
    }
    if (mb) {
      return `Internal network data transfer of ${mb} MB completed.`;
    }
    return "Internal data transfer completed.";
  }

  // File Download
  if (ev === "file_download") {
    if (details.file_name) {
      return `Downloaded file: ${details.file_name}.`;
    }
    return "Standard file download from repository.";
  }

  // File Upload
  if (ev === "file_upload") {
    if (details.file_name) {
      return `Uploaded file: ${details.file_name}.`;
    }
    return "Standard file upload to repository.";
  }

  // Email
  if (ev === "email_activity") {
    if (details.recipient_count) {
      return `Sent email communication to ${details.recipient_count} recipient(s).`;
    }
    return "Corporate email communications activity.";
  }

  // Remote Access
  if (ev === "remote_access") {
    return "Remote workstation access session active.";
  }

  // Fallback: clean key-value summary without JSON symbols
  const cleanPairs = Object.entries(details)
    .filter(([k]) => k !== "_id" && k !== "id" && k !== "risk_flag")
    .map(([k, v]) => {
      const cleanKey = k.replace(/_/g, " ");
      const cleanVal = typeof v === "object" ? "" : String(v);
      return `${cleanKey}: ${cleanVal}`;
    })
    .filter((s) => s.trim().length > 0)
    .slice(0, 3);

  if (cleanPairs.length > 0) {
    return cleanPairs.join(", ");
  }

  return "Normal monitored employee activity.";
}
