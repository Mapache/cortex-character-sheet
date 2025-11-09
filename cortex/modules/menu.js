
/**
 * @param {[Node]} entries
 * @returns {Node}
 */
export function menu(entries) {
  const div = document.createElement("div")
  div.classList.add("context-menu")
  const ul = document.createElement("ul")
  for (const entry of entries) {
    ul.appendChild(entry)
  }
  div.appendChild(ul)
  return div
}

/**
 * @param {string} name
 * @param {((event: Event) => void)} action
 * @param {[Node]} subMenuEntries
 * @returns {Node}
 */
export function menuEntry(name, action, subMenuEntries) {
  const li = document.createElement("li")
  li.appendChild(document.createTextNode(name))
  if (subMenuEntries) {
    const subMenu = menu(subMenuEntries)
    const arrow = document.createElement("i")
    arrow.classList.add("fa-angle-right")
    li.appendChild(arrow)
    li.appendChild(subMenu)
    if (action) {
      li.onclick = (e) => {
        // Do not trigger the menu action when clicking the subMenu
        if (!subMenu.contains(e.target)) {
          action(e)
        }
      }
    }
  } else { // No subMenu
    if (action) {
      li.onclick = action
    }
  }
  return li
}

export function menuDivider() {
  return document.createElement("hr")
}

export function menuLabel(text) {
  const p = document.createElement("p")
  p.appendChild(document.createTextNode(text))
  return p
}

export function menuTextInput(placeholder, value, action) {
  const input = document.createElement("input")
  input.setAttribute("type", "text")
  input.setAttribute("placeholder", placeholder)
  input.setAttribute("value", value)
  // input.onchange = (event) => {
  //   action(input.value)
  // }
  input.onkeyup = (event) => {
    if (event.key === "Enter") {
      action(input.value)
    }
  }
  return input
}