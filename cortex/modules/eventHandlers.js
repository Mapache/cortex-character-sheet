import { diceToHtml, textToHtml, htmlToText, htmlToEditable, editableToHtml } from "./conversion.js"
import { Flags } from "./flags.js"

export let isEditingEnabled = true

export function setEditingEnabled(value) {
  isEditingEnabled = value
}

export function addEditHandlers(parent) {
  const editables = parent.querySelectorAll("div[contenteditable], h1[contenteditable], h2[contenteditable]")
  for (const editable of editables) {
    if (editable.classList.contains("trait-value")) {
      // Dice field elements get special conversion that limits HTML elements but aggressively seeks out dice-like values.
      addEditHandlersToDiceField(editable)
    } else {
      addEditHandlersToNode(editable)
    }
  }
}

function addEditHandlersToNode(editable) {
  editable.addEventListener("focus", (e) => {
    if (isEditingEnabled) {
      if (Flags.useEditableHTML) {
        e.target.innerHTML = htmlToEditable(e.target.innerHTML)
      } else {
        e.target.innerText = htmlToText(e.target.innerHTML)
      }
      moveCaretToEndOf(e.target)
    } else {
      e.target.blur()
    }
  })
  editable.addEventListener("blur", (e) => {
    if (isEditingEnabled) {
      if (Flags.useEditableHTML) {
        e.target.innerHTML = editableToHtml(e.target.innerHTML)
      } else {
        e.target.innerHTML = textToHtml(e.target.innerText)
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

function addEditHandlersToDiceField(diceField) {
  diceField.addEventListener("focus", (e) => {
    if (isEditingEnabled) {
      // Don't need to do any conversion; okay to edit as HTML.
      moveCaretToEndOf(e.target)
    } else {
      e.target.blur()
    }
  })
  diceField.addEventListener("blur", (e) => {
    if (isEditingEnabled) {
      e.target.innerHTML = diceToHtml(e.target.innerHTML)
    }
  })

  diceField.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "2":
      case "4":
      case "6":
      case "8":
      case "0":
        // Instantly convert dice
        const diceField = e.target
        diceField.innerHTML = diceToHtml(diceField.innerHTML)
        moveCaretToEndOf(diceField)
    }
  })
}
/**
 * @param {Node} node
 * @param {null | Node} clickTarget
 * @param {true | (() => boolean)} shouldAllowEditing
 * @param {null | (() => void)} editingDisallowedAction
 * @param {((text) => void)} editingCompleteAction
 * @returns {void}
 */
export function addClickToEditHandlersToTextNode(
  node,
  clickTarget,
  shouldAllowEditing,
  editingCompleteAction
) {
  (clickTarget ?? node).addEventListener("click", (e) => {
    if (shouldAllowEditing === true || shouldAllowEditing()) {
      node.contentEditable = true
      node.focus()
    }
  })
  node.addEventListener("focus", (e) => {
    selectAllTextOf(node)
  })
  node.addEventListener("blur", async (e) => {
    node.contentEditable = false
    editingCompleteAction(node.innerText.trim())
  })
  // Enter finishes editing.
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.target.blur()
    }
  })
}

export function moveCaretToEndOf(editable) {
  const range = document.createRange()
  range.selectNodeContents(editable)
  range.collapse(false)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

export function selectAllTextOf(editable) {
  const range = document.createRange()
  range.selectNodeContents(editable)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}