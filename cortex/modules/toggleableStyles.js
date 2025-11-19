import { ToggleableStyle } from "./toggleableStyle.js"

// Show layout controls by default
export const layoutControlsHidden = new ToggleableStyle(
  ".toggle-layout-controls",
  "controls-hidden",
  "controls-visible",
  `
    .pages .no-print {
      display: none !important;
    }
  `,
  "",
  false)

// Hide empty trait descriptions by default
export const emptyDescriptionsHidden = new ToggleableStyle(
  ".toggle-empty-descriptions",
  "descriptions-hidden",
  "descriptions-visible",
  `
    .trait-description:empty {
      display: none !important;
    }
    .trait-description:empty:focus {
      display: inline !important;
    }
  `,
  `
    .trait-description:empty {
      background: linear-gradient(-45deg, #eee 40%, #fafafa 50%, #eee 60%);
      background-size: 300%;
      animation: shimmer 4s infinite linear;
    }
  `,
  true)