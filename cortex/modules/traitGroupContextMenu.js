import { didModifyDisplayedCharacterSheet } from "./displayedCharacter.js"
import { updatePagePlaceholderControl } from "./elements.js"
import { Modal } from "./modal.js"
import { applyDataStyle, applyHighlightColor, defaultHighlightColor } from "./traitGroupStyle.js"

const contextMenuModal = await Modal.build("context-menu")
const contextMenu = contextMenuModal.modal
const colorPicker = contextMenu.querySelector("#trait-collection-highlight-picker")

let traitGroup = null
export async function showContextMenu(e) {
  // Explicitly a global value, not a local one, for the menu handlers to use.
  traitGroup = e.target.parentElement
  if (!traitGroup.classList.contains("trait-group")) {
    console.error("Invalid context menu placement", traitGroup)
    traitGroup = null
    return
  }

  let traitGroupColor = traitGroup.getAttribute("highlight-color")
  let rootColor = document.querySelector(":root").getAttribute("highlight-color")
  colorPicker.value = traitGroupColor ?? rootColor ?? defaultHighlightColor

  // Check matching data-style
  let traitGroupStyle = traitGroup.getAttribute("data-style")
  let menuEntries = contextMenu.querySelectorAll("#context-menu #styles input")
  let found = false
  for (let menuEntry of menuEntries) {
    let menuStyle = menuEntry.getAttribute("data-style")
    let checked = menuStyle === traitGroupStyle
    menuEntry.checked = checked
    found = found || checked
  }
  if (!found) {
    contextMenu.querySelector("#style-detailed").checked = true
  }

  let rect = e.target.getBoundingClientRect()
  let x = rect.left + window.scrollX
  let y = rect.top + window.scrollY
  contextMenuModal.showAt(x, y)
}

async function closeContextMenu() {
  traitGroup = null
  contextMenuModal.hide()
}

// MARK: Highlight Color

export async function setTraitGroupHighlightColor(e) {
  applyHighlightColor(traitGroup, colorPicker.value)

  // Do NOT closeContextMenu()
  didModifyDisplayedCharacterSheet()
}

export async function removeTraitGroupHighlightColor(e) {
  applyHighlightColor(traitGroup, null)

  closeContextMenu()
  didModifyDisplayedCharacterSheet()
}

// MARK: Data Styles

export async function setStyle(e) {
  let style = e.target.getAttribute("data-style")
  applyDataStyle(traitGroup, style)

  closeContextMenu()
  didModifyDisplayedCharacterSheet()
}

export async function removeTraitGroup(e) {
  traitGroup.remove()

  closeContextMenu()

  // This could have been the last trait group on the last page.
  updatePagePlaceholderControl()
}

// MARK: Moving Trait Groups

export async function moveToTop(e) {
  let column = traitGroup.parentElement
  column.prepend(traitGroup)

  closeContextMenu()
}

export async function moveToBottom(e) {
  let column = traitGroup.parentElement
  addTraitGroupToColumnBottom(traitGroup, column)

  closeContextMenu()
}

export async function moveUp(e) {
  let previousTraitGroup = traitGroup.previousElementSibling
  if (previousTraitGroup) {
    previousTraitGroup.before(traitGroup)
  }

  closeContextMenu()
}

export async function moveDown(e) {
  let nextTraitGroup = traitGroup.nextElementSibling
  if (!nextTraitGroup.classList.contains("add-item")) {
    nextTraitGroup.after(traitGroup)
  }

  closeContextMenu()
}

export async function moveToOtherColumn(e) {
  let column = traitGroup.parentElement
  if (column.classList.contains("left")) {
    column = column.nextElementSibling
  } else {
    column = column.previousElementSibling
  }
  addTraitGroupToColumnBottom(traitGroup, column)

  closeContextMenu()
}

export async function moveToNextPage(e) {
  let column = traitGroup.parentElement
  let page = column.parentElement
  let newPage = page.nextElementSibling
  if (newPage && newPage.classList.contains("page")) { // Avoid the placeholder
    let newColumn = newPage.querySelector(".page-column.left")
    addTraitGroupToColumnBottom(traitGroup, newColumn)
  }

  closeContextMenu()

  // This could now be the first trait group on the last page.
  updatePagePlaceholderControl()
}

export async function moveToPreviousPage(e) {
  let column = traitGroup.parentElement
  let page = column.parentElement
  let newPage = page.previousElementSibling
  if (newPage && newPage.classList.contains("page")) { // Previous sibling should always be a page, but still check
    let newColumn = newPage.querySelector(".page-column.right")
    addTraitGroupToColumnBottom(traitGroup, newColumn)
  }

  closeContextMenu()

  // This could have been the last trait group on the last page.
  updatePagePlaceholderControl()
}

function addTraitGroupToColumnBottom(traitGroup, column) {
  let traitGroups = column.children
  let traitGroupPlaceholder = traitGroups[traitGroups.length - 1]
  traitGroupPlaceholder.before(traitGroup)
}