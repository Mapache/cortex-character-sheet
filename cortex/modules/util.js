
export function whenInteractive(action) {
  if (document.readyState === "loading") {
    // Need to wait until the DOM is loaded before trying to alter it.
    document.addEventListener("readystatechange", (event) => {
      if (event.target.readyState === "interactive") {
        action()
      }
    })
  } else {
    action()
  }
}