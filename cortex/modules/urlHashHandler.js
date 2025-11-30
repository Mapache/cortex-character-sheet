import { whenInteractive } from "./defer.js"
import { updateDocumentTitle } from "./displayedCharacter.js"

function currentUrlHashParams() {
  // Slice off the "#", as URLSearchParams is designed for query strings with an "?"
  return new URLSearchParams(window.location.hash.slice(1))
}

// Extracts and saves the params in the initial URL hash, before anything modifies it.
// Modules can import this to ensure it's extracted before modifying window.location.hash,
// but probably want to wrap any programmatic hash changes in ignoreHashChanges() to avoid
// infinite loops.
export const initialUrlHashParams = currentUrlHashParams()

let hashHandlers = new Set()

export class HashHandler {
  constructor(param, action) {
    this.param = param
    this.action = action
  }

  addListener() {
    hashHandlers.add(this)
    whenInteractive(() => {
      this.check(initialUrlHashParams)
    })
  }

  removeListener() {
    hashHandlers.delete(this)
  }

  check(urlHashParams) {
    if (urlHashParams.has(this.param)) {
      const value = urlHashParams.get(this.param)
      this.action(value)
    }
  }
}

function checkHashHandlers(urlHashParams) {
  for (const hashHandler of hashHandlers) {
    hashHandler.check(urlHashParams)
  }
}

export function setUrlHashWithoutHandling(hash, characterName) {
  history.pushState({}, "", hash)
  updateDocumentTitle(characterName)
}

window.addEventListener("hashchange", (e) => {
  console.debug(`Handling hash change to: ${window.location.hash}`)
  checkHashHandlers(currentUrlHashParams())
})