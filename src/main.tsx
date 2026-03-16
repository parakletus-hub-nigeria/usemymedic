import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build cache buster: 2026-03-16T00:00:00Z
const rootEl = document.getElementById("root");

if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("App failed to mount:", err);
    rootEl.innerHTML =
      '<div style="padding:2rem;font-family:system-ui;text-align:center;">' +
      '<h1>Something went wrong</h1>' +
      '<p>Please try refreshing the page.</p></div>';
  }
} else {
  document.body.innerHTML =
    '<div style="padding:2rem;font-family:system-ui;text-align:center;">' +
    '<h1>App Error</h1><p>Root element not found.</p></div>';
}
