import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const voicePartitionTheme = defineTheme({
  name: "voice-partition",
  extends: neutralTheme,
  color: {
    accent: ["#16785A", "#56C79F"],
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
  radius: { base: 6, multiplier: 1.35 },
  motion: { fast: 130, medium: 300, slow: 720, ratio: 0.78 },
  tokens: {
    "--color-background-body": ["#FFFFFF", "#111A16"],
    "--color-background-surface": ["#FEFFFD", "#18221D"],
    "--color-background-card": ["#FFFFFF", "#1E2A24"],
    "--color-background-popover": ["#FFFFFF", "#243129"],
    "--color-background-muted": ["#F6F8F5", "#202B25"],
    "--color-text-primary": ["#14231D", "#EFF7F2"],
    "--color-text-secondary": ["#66736C", "#B4C3BB"],
    "--color-text-disabled": ["#9AA39E", "#75847C"],
    "--color-border": ["#E4E9E5", "#35443C"],
    "--color-border-emphasized": ["#C3CCC6", "#5A6B62"],
    "--color-on-accent": ["#FFFFFF", "#0D2119"],
    "--focus-outline-color": "var(--color-accent)",
    "--color-background-red": ["#FFF5F3", "#442925"],
    "--color-border-red": ["#F5928A", "#D97870"],
    "--color-text-red": ["#792E29", "#FFC6C0"],
    "--color-icon-red": ["#B64D45", "#F5928A"],
    "--color-background-yellow": ["#FFFAE7", "#40371E"],
    "--color-border-yellow": ["#F7D06B", "#D3AE53"],
    "--color-text-yellow": ["#654D08", "#FFE594"],
    "--color-icon-yellow": ["#9A7413", "#F7D06B"],
    "--color-background-green": ["#EAF8EF", "#203A2A"],
    "--color-border-green": ["#9BD9B0", "#69B886"],
    "--color-text-green": ["#195F43", "#ADF1C4"],
    "--color-icon-green": ["#2A7D57", "#9BD9B0"],
    "--color-background-teal": ["#EEF9F6", "#1C3A32"],
    "--color-border-teal": ["#78C2AD", "#55A891"],
    "--color-text-teal": ["#0C654E", "#9BE4CF"],
    "--color-icon-teal": ["#16785A", "#78C2AD"],
    "--shadow-low": "0 2px 10px light-dark(#14231D0A, #00000040)",
    "--shadow-med": "0 12px 32px light-dark(#14231D10, #00000052)"
  },
  components: {
    button: {
      base: {
        borderRadius: "var(--radius-full)",
        fontWeight: "var(--font-weight-semibold)"
      }
    },
    card: {
      base: {
        borderRadius: "var(--radius-container)"
      }
    }
  }
});
