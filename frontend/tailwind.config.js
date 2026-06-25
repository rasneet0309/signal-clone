/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Signal's signature blue, used for outgoing bubbles, links, primary buttons
        signal: {
          blue: "#3A76F0",
          "blue-dark": "#2C5FD1",
        },
        // Sidebar / chat list background tones (Signal uses near-white / soft gray)
        panel: {
          DEFAULT: "#FFFFFF",
          sidebar: "#F7F7F8",
          hover: "#ECECEE",
          border: "#E4E4E6",
        },
        bubble: {
          // incoming message bubble (light gray)
          incoming: "#F0F0F2",
          // outgoing message bubble uses signal.blue
        },
        ink: {
          DEFAULT: "#1B1B1F",
          muted: "#6B6B72",
          faint: "#9A9AA1",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        bubble: "18px",
      },
    },
  },
  plugins: [],
};
