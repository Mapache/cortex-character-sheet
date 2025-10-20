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

// Extracts and saves the params in the initial URL hash, before anything modifies it.
// Modules can import this to ensure it's extracted before modifying window.location.hash
//
// Slice off the "#", as URLSearchParams is designed for query strings with an "?"
export const urlHashParams = new URLSearchParams(window.location.hash.slice(1))