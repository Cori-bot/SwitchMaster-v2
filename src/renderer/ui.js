import { state, constants } from './state.js';

const ipcRenderer = window.ipc;

export function devLog(...args) {
  if (window.env.isDev) {
    console.log(...args);
    ipcRenderer.send("log-to-main", { level: "log", args });
  }
}

export function devError(...args) {
  if (window.env.isDev) {
    console.error(...args);
    ipcRenderer.send("log-to-main", { level: "error", args });
  }
}

export function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  const toast = document.createElement("div");
  toast.className = `notification-toast ${type}`;

  const icon = getNotificationIcon(type);
  if (icon) {
    const iconWrapper = document.createElement("span");
    iconWrapper.className = "notification-icon-wrapper";
    const parser = new DOMParser();
    const svgNode = parser.parseFromString(icon, "image/svg+xml").documentElement;
    iconWrapper.appendChild(svgNode);
    toast.appendChild(iconWrapper);
  }

  const messageSpan = document.createElement("span");
  messageSpan.className = "notification-message";
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  container.appendChild(toast);
  toast.offsetHeight; // force reflow
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("closing");
    toast.addEventListener("animationend", () => toast.remove());
  }, constants.NOTIFICATION_DISPLAY_TIME_MS);
}

function getNotificationIcon(type) {
  const successColor = getComputedStyle(document.documentElement).getPropertyValue("--success");
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  
  if (type === "success") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${successColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === "error") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4655" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }
}

export function escapeHtml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#096;");
}

export function setSafeHTML(element, html) {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
  if (!html) return;

  if (typeof window.DOMPurify !== "undefined") {
    try {
      const fragment = window.DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
      element.appendChild(fragment);
      return;
    } catch (e) {
      devError("DOMPurify error:", e);
    }
  }

  // Fallback
  const parser = new DOMParser();
  try {
    const doc = parser.parseFromString(html, "text/html");
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(node => fragment.appendChild(document.importNode(node, true)));
    element.appendChild(fragment);
  } catch (e) {
    element.textContent = html;
  }
}
