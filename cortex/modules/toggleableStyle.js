import { whenInteractive } from "./util.js"

export class ToggleableStyle {
  constructor(controlSelector, enabledControlClass, disabledControlClass, enabledStyle, disabledStyle, startsEnabled) {
    this.controlSelector = controlSelector
    this.enabledControlClass = enabledControlClass
    this.disabledControlClass = disabledControlClass

    if (enabledStyle) {
      this.enabledStyleSheet = document.createElement("style")
      this.enabledStyleSheet.innerText = enabledStyle
    }

    if (disabledStyle) {
      this.disabledStyleSheet = document.createElement("style")
      this.disabledStyleSheet.innerText = disabledStyle
    }

    this.enabled = false
    whenInteractive(() => {
      this.setEnabled(startsEnabled)
    })
  }

  enable() {
    this.enabled = true

    if (this.disabledStyleSheet && this.disabledStyleSheet.parentNode !== null) {
      document.head.removeChild(this.disabledStyleSheet)
    }
    if (this.enabledStyleSheet) {
      document.head.appendChild(this.enabledStyleSheet)
    }

    for (const control of document.querySelectorAll(this.controlSelector)) {
      control.classList.remove(this.disabledControlClass)
      control.classList.add(this.enabledControlClass)
    }
  }

  disable() {
    this.enabled = false

    if (this.enabledStyleSheet && this.enabledStyleSheet.parentNode !== null) {
      document.head.removeChild(this.enabledStyleSheet)
    }
    if (this.disabledStyleSheet) {
      document.head.appendChild(this.disabledStyleSheet)
    }

    for (const control of document.querySelectorAll(this.controlSelector)) {
      control.classList.remove(this.enabledControlClass)
      control.classList.add(this.disabledControlClass)
    }
  }

  setEnabled(enabled) {
    if (enabled) {
      this.enable()
    } else {
      this.disable()
    }
  }

  toggle() {
    this.setEnabled(!this.enabled)
  }

}