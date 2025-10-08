import { Modal } from "./modal.js"
import { apply_data_style, apply_highlight_color, defaultHighlightColor } from "./traitGroupStyle.js"

const contextMenuModal = await Modal.build("context-menu", function () { })
const contextMenu = contextMenuModal.modal
const colorPicker = contextMenu.querySelector("#trait-collection-highlight-picker")

let g_context_target = null
export async function show_context_menu(e) {
  g_context_target = e.target
  let traitGroup = g_context_target.parentElement

  let traitGroupColor = traitGroup.getAttribute("highlight-color")
  let rootColor = document.querySelector(":root").getAttribute("highlight-color")
  colorPicker.value = traitGroupColor ?? rootColor ?? defaultHighlightColor

  // Check matching data-style
  let traitGroupStyle = traitGroup.getAttribute("data-style")
  let menuEntries = contextMenu.querySelectorAll("#context-menu #styles input")
  let found = false
  for (let menuEntry of menuEntries) {
    let menuStyle = menuEntry.getAttribute("data-style")
    let checked = menuStyle == traitGroupStyle
    menuEntry.checked = checked
    found = found || checked
  }
  if (!found) {
    contextMenu.querySelector("#style-detailed").checked = true
  }

  let rect = e.target.getBoundingClientRect()
  let x = rect.left + window.scrollX + "px"
  let y = rect.top + window.scrollY + "px"
  contextMenuModal.showAt(x, y)
}

async function close_context_menu() {
  g_context_target = null
  contextMenuModal.hide()
}

export async function set_trait_collection_highlight_color(e) {
  let traitGroup = g_context_target.parentElement
  apply_highlight_color(traitGroup, colorPicker.value)

  // Do NOT close_context_menu()
}

export async function remove_trait_collection_highlight_color(e) {
  let traitGroup = g_context_target.parentElement
  traitGroup.removeAttribute("highlight-color")
  traitGroup.style.removeProperty("--highlight")

  close_context_menu()
}

export async function set_style(e) {
  let elem = g_context_target.parentElement
  let style = e.target.getAttribute("data-style")
  apply_data_style(elem, style)

  close_context_menu()
}

export async function context_menu_remove_item(e) {
  let item = g_context_target.parentElement
  item.parentElement.removeChild(item)

  close_context_menu()
}

export async function move_to_top(e) {
  let traitGroup = g_context_target.parentElement
  let column = traitGroup.parentElement
  column.prepend(traitGroup)

  close_context_menu()
}

export async function move_to_bottom(e) {
  let traitGroup = g_context_target.parentElement
  let column = traitGroup.parentElement
  add_trait_group_to_column_bottom(traitGroup, column)

  close_context_menu()
}

export async function move_up(e) {
  let traitGroup = g_context_target.parentElement
  let previousTraitGroup = traitGroup.previousElementSibling
  if (previousTraitGroup) {
    previousTraitGroup.before(traitGroup)
  }

  close_context_menu()
}

export async function move_down(e) {
  let traitGroup = g_context_target.parentElement
  let nextTraitGroup = traitGroup.nextElementSibling
  if (!nextTraitGroup.classList.contains("add-item")) {
    nextTraitGroup.after(traitGroup)
  }

  close_context_menu()
}

export async function move_to_other_column(e) {
  let traitGroup = g_context_target.parentElement
  let column = traitGroup.parentElement
  if (column.classList.contains("left")) {
    column = column.nextElementSibling
  } else {
    column = column.previousElementSibling
  }
  add_trait_group_to_column_bottom(traitGroup, column)

  close_context_menu()
}

export async function move_to_next_page(e) {
  let traitGroup = g_context_target.parentElement
  let column = traitGroup.parentElement
  let page = column.parentElement
  let newPage = page.nextElementSibling
  if (newPage && newPage.classList.contains("page")) { // Avoid the placeholder
    let newColumn = newPage.querySelector(".page-column.left")
    add_trait_group_to_column_bottom(traitGroup, newColumn)
  }

  close_context_menu()
}

export async function move_to_previous_page(e) {
  let traitGroup = g_context_target.parentElement
  let column = traitGroup.parentElement
  let page = column.parentElement
  let newPage = page.previousElementSibling
  if (newPage && newPage.classList.contains("page")) { // Previous sibling should always be a page, but still check
    let newColumn = newPage.querySelector(".page-column.right")
    add_trait_group_to_column_bottom(traitGroup, newColumn)
  }

  close_context_menu()
}

function add_trait_group_to_column_bottom(traitGroup, column) {
  let traitGroups = column.children
  let traitGroupPlaceholder = traitGroups[traitGroups.length - 1]
  traitGroupPlaceholder.before(traitGroup)
}