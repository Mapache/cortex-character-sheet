// Performs the action exactly once, when the document becomes interactive,
// or immediately if it already is interactive
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

// A Promise whose resolve & reject are deferred until an external caller
export class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}