import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// Apply dark theme as default
const defaultDarkTheme = {
  '--color-primary-50': '#1a1a2e',
  '--color-primary-100': '#16213e',
  '--color-primary-500': '#8b5cf6',
  '--color-primary-600': '#7c3aed',
  '--color-primary-700': '#6d28d9',
  '--color-secondary-50': '#0f172a',
  '--color-secondary-100': '#1e293b',
  '--color-secondary-500': '#3b82f6',
  '--color-secondary-600': '#2563eb',
  '--color-secondary-700': '#1d4ed8',
  '--color-bg-light': '#000000',
  '--color-bg-mild': '#111111',
  '--color-bg-soft': '#1a1a1a',
  '--color-gray-50': '#f8fafc',
  '--color-gray-100': '#f1f5f9',
  '--color-gray-200': '#e2e8f0',
  '--color-gray-300': '#cbd5e1',
  '--color-gray-400': '#94a3b8',
  '--color-gray-500': '#64748b',
  '--color-gray-600': '#475569',
  '--color-gray-700': '#334155',
  '--color-gray-800': '#1e293b',
  '--color-gray-900': '#0f172a'
};

// Check for saved theme first, otherwise apply default dark theme
const appliedTheme = localStorage.getItem('theme-applied');
const savedColors = localStorage.getItem('theme-colors');

let themeToApply = defaultDarkTheme;

if (appliedTheme === 'true' && savedColors) {
  try {
    const parsedColors = JSON.parse(savedColors);
    themeToApply = { ...defaultDarkTheme, ...parsedColors };
    console.log('Applied saved theme on page load:', Object.keys(parsedColors).length, 'variables');
  } catch (error) {
    console.error('Error applying saved theme on page load:', error);
  }
} else {
  console.log('Applied default dark theme');
}

// Apply the theme
Object.entries(themeToApply).forEach(([variable, value]) => {
  document.documentElement.style.setProperty(variable, value);
});

// Apply body background
document.body.style.backgroundColor = themeToApply['--color-bg-light'];

// Ensure styles are applied by forcing a reflow
document.body.offsetHeight;

// Mark theme as loaded for components
document.documentElement.setAttribute('data-theme-loaded', 'true');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
