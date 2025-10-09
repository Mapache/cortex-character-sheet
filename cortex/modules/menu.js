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

export function menuEntry(name, action) {
  const li = document.createElement("li")
  li.appendChild(document.createTextNode(name))
  li.onclick = action
  return li
}

export function menuDivider() {
  return document.createElement("hr")
}

export function menuSubMenu(name, entries) {
  const li = document.createElement("li")
  li.appendChild(document.createTextNode(name))
  const arrow = document.createElement("i")
  arrow.classList.add("fa-angle-right")
  li.appendChild(arrow)
  li.appendChild(menu(entries))
  return li
}