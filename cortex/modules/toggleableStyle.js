import { whenInteractive } from "./util.js"

export class ToggleableStyle {
  constructor(controlSelector, enabledControlClass, enabledStyle, disabledStyle, startsEnabled) {
    this.controlSelector = controlSelector
    this.enabledControlClass = enabledControlClass

    this.enabledStyleSheet = document.createElement("style")
    this.enabledStyleSheet.innerText = enabledStyle

    this.disabledStyleSheet = document.createElement("style")
    this.disabledStyleSheet.innerText = disabledStyle

    this.enabled = false
    whenInteractive(() => {
      this.setEnabled(startsEnabled)
    })
  }

  enable() {
    this.enabled = true
    if (this.disabledStyleSheet.parentNode !== null) {
      document.head.removeChild(this.disabledStyleSheet)
    }
    document.head.appendChild(this.enabledStyleSheet)
    document.querySelector(this.controlSelector).classList.add(this.enabledControlClass)
  }

  disable() {
    this.enabled = false
    if (this.enabledStyleSheet.parentNode !== null) {
      document.head.removeChild(this.enabledStyleSheet)
    }
    document.head.appendChild(this.disabledStyleSheet)
    document.querySelector(this.controlSelector).classList.remove(this.enabledControlClass)
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