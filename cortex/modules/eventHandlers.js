import { c_to_html, text_to_html, html_to_text, html_to_editable, editable_to_html } from "./conversion.js"
import { Flags } from "./flags.js"

export let isEditingEnabled = true

export function setEditingEnabled(value) {
  isEditingEnabled = value
}

export function addEditHandlers(parent) {
  let editables = parent.querySelectorAll("div[contenteditable], h1[contenteditable], h2[contenteditable]")
  for (let editable of editables) {
    addEditHandlersToNode(editable)
  }

  // C elements get limited conversion; we don't want to add nested C elements.
  let cs = parent.querySelectorAll("c[contenteditable]")
  for (let c of cs) {
    addEditHandlersToC(c)
  }
}

function addEditHandlersToNode(editable) {
  editable.addEventListener("focus", (e) => {
    if (isEditingEnabled) {
      if (Flags.useEditableHTML) {
        e.target.innerHTML = html_to_editable(e.target.innerHTML)
      } else {
        e.target.innerText = html_to_text(e.target.innerHTML)
      }
    } else {
      e.target.blur()
    }
  })
  editable.addEventListener("blur", (e) => {
    if (isEditingEnabled) {
      if (Flags.useEditableHTML) {
        e.target.innerHTML = editable_to_html(e.target.innerHTML)
      } else {
        e.target.innerHTML = text_to_html(e.target.innerText)
      }
    }
  })

  if (editable.classList.contains("header")) {
    editable.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        e.target.blur()
      }
    })
  } else {
    editable.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        document.execCommand("insertLineBreak")
      }
    })
  }
}

// Doesn't actually work; frequently inserts after the caret.
function insertLineBreakManual() {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const br = document.createElement("br")
  range.insertNode(br)
  range.setStartAfter(br)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function addEditHandlersToC(c) {
  c.addEventListener("focus", (e) => {
    if (isEditingEnabled) {
      e.target.innerText = html_to_text(e.target.innerHTML)
    } else {
      e.target.blur()
    }
  })
  c.addEventListener("blur", (e) => {
    if (isEditingEnabled) {
      e.target.innerHTML = c_to_html(e.target.innerText)
    }
  })
}