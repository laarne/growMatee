export const colors = {
  // ── Core greens ───────────────────────────────────────
  green: "#1a3a22",        // darkest — text, active states
  greenDark: "#0f2214",    // ultra dark — header text
  greenMid: "#2d5a3d",     // medium — secondary actions
  greenMuted: "#5a7060",   // muted — secondary text, labels
  leaf: "#4caf50",         // vivid accent — badges, highlights
  leafLight: "#81c784",    // soft accent

  // ── Surfaces ──────────────────────────────────────────
  cream: "#f6faf2",        // screen background
  surface0: "#ffffff",     // card background
  surface1: "#f0f7ea",     // subtle tint (sage replacement)
  surface2: "#e4f0d8",     // stronger tint

  // ── Legacy aliases (keep old names working) ───────────
  white: "#ffffff",
  sage: "#f0f7ea",
  sageStrong: "#cfe6b5",

  // ── Borders / lines ───────────────────────────────────
  line: "#dce8d2",
  lineMid: "#c5d9b8",

  // ── Semantic ──────────────────────────────────────────
  warning: "#fff8e6",
  warningText: "#92650a",
  error: "#fef2f2",
  errorText: "#991b1b",
  success: "#f0fdf4",
  successText: "#166534",

  // ── Text ──────────────────────────────────────────────
  textPrimary: "#1a3a22",
  textSecondary: "#5a7060",
  textTertiary: "#8fa889",
  textInverse: "#ffffff",
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
};

export const shadow = {
  sm: {
    shadowColor: "#1a3a22",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#1a3a22",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};
