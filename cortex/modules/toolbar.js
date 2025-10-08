import { Modal } from "./modal.js"
import { apply_highlight_color } from "./traitGroupStyle.js"
import { ToggleableStyle } from "./toggleableStyle.js"

export function set_global_highlight_color(e) {
  let colorPicker = document.getElementById("global-highlight-picker")
  let root = document.querySelector(":root")
  apply_highlight_color(root, colorPicker.value)
}

// Show layout controls by default
export const layoutControlsHidden = new ToggleableStyle(
  "#toggle-layout-controls",
  "controls-hidden",
  `
		.pages .no-print {
			display: none !important;
		}
	`,
  "",
  false)

// Hide empty trait descriptions by default
export const emptyDescriptionsHidden = new ToggleableStyle(
  "#toggle-empty-descriptions",
  "descriptions-hidden",
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
		@keyframes shimmer {
			0% {
				background-position-x: 100%;
			}
			25%, 100% {
				background-position-x: 0%;
			}
		}
	`,
  true)

export const helpModal = new Modal("help-modal", function () {})