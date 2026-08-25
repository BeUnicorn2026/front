import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const voicePartitionTheme = defineTheme({
  name: "voice-partition",
  extends: neutralTheme,
  color: {
    accent: ["#16785A", "#7FD3A8"],
    neutralStyle: "warm",
    contrast: "standard"
  },
  typography: {
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: "IBM Plex Sans KR",
      fallbacks: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    heading: {
      family: "IBM Plex Sans KR",
      fallbacks: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      weight: "semibold",
      weights: { 1: "semibold", 2: "semibold", 3: "semibold", 4: "medium", 5: "medium", 6: "medium" }
    },
    code: {
      family: "IBM Plex Mono",
      fallbacks: '"SF Mono", ui-monospace, monospace'
    }
  },
  radius: { base: 4, multiplier: 1.5 },
  motion: { fast: 130, medium: 300, slow: 720, ratio: 0.78 },
  tokens: {
    "--radius-inner": "8px",
    "--radius-element": "12px",
    "--radius-container": "16px",
    "--radius-page": "24px",
    "--layout-rail-width": "72px",
    "--layout-side-nav-width": "248px",
    "--layout-document-panel-width": "420px",
    "--layout-auth-brand-width": "600px",
    "--layout-dashboard-panel-width": "340px",
    "--brand-mint": "#9BD9B0",
    "--brand-coral": "#F5928A",
    "--brand-yellow": "#F7D06B",
    "--brand-cream": "#F9F4E4",
    "--brand-ink": "#14231D",
    "--color-background-body": ["#FCF9F1", "#131A17"],
    "--color-background-surface": ["#FFFFFF", "#1E2925"],
    "--color-background-card": ["#FFFFFF", "#1A2320"],
    "--color-background-popover": ["#FFFFFF", "#1E2925"],
    "--color-background-muted": ["#F5F1E5", "#1A2320"],
    "--color-text-primary": ["#1C2A24", "#EDF3EF"],
    "--color-text-secondary": ["#63736A", "#A7B8AF"],
    "--color-text-disabled": ["#9FADA5", "#64756C"],
    "--color-text-accent": ["#12694E", "#9BDDBB"],
    "--color-border": ["#ECE5D5", "#2C3833"],
    "--color-border-emphasized": ["#D8D0BB", "#3E4C46"],
    "--color-on-accent": ["#FFFFFF", "#0B1F16"],
    "--focus-outline-color": "var(--color-accent)",
    "--color-background-red": ["#FDEEEB", "#3A2320"],
    "--color-border-red": ["#F3B3AA", "#6B3A33"],
    "--color-text-red": ["#9E3A30", "#F6BDB5"],
    "--color-icon-red": ["#C0483C", "#F2A79E"],
    "--color-background-yellow": ["#FDF5E0", "#38301A"],
    "--color-border-yellow": ["#EBD48A", "#5A4A1E"],
    "--color-text-yellow": ["#6E5400", "#F3DA95"],
    "--color-icon-yellow": ["#8A6A00", "#F0CE6E"],
    "--color-background-green": ["#E7F6EC", "#1F3428"],
    "--color-border-green": ["#A9DBBE", "#2F5A44"],
    "--color-text-green": ["#16613F", "#A6E3C2"],
    "--color-icon-green": ["#1C7A55", "#8ED9B2"],
    "--color-background-teal": ["#E5F5F3", "#17332F"],
    "--color-border-teal": ["#A3D8D2", "#2C5751"],
    "--color-text-teal": ["#0B6158", "#A2E2DA"],
    "--color-icon-teal": ["#0E7A6E", "#86D8CE"],
    "--shadow-low": "0 1px 2px light-dark(#14231D0D, #0000004D), 0 4px 10px light-dark(#14231D0F, #00000066)",
    "--shadow-med": "0 2px 6px light-dark(#14231D0F, #00000059), 0 10px 24px light-dark(#14231D14, #00000080)"
  }
});
