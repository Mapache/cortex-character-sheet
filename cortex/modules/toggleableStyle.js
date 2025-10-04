export class ToggleableStyle {
  constructor(controlSelector, enabledControlClass, enabledStyle, disabledStyle, startsEnabled) {
    this.controlSelector = controlSelector
    this.enabledControlClass = enabledControlClass

    this.enabledStyleSheet = document.createElement("style")
    this.enabledStyleSheet.innerText = enabledStyle

    this.disabledStyleSheet = document.createElement("style")
    this.disabledStyleSheet.innerText = disabledStyle

    this.enabled = false
    if (startsEnabled) {
      // Need to wait until the DOM is loaded before trying to alter it.
      document.addEventListener("readystatechange", (event) => {
        if (event.target.readyState === "interactive") {
          this.toggle()
        }
      })
    }
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

  toggle() {
    if (this.enabled) {
      this.disable()
    } else {
      this.enable()
    }
  }

}