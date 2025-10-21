import { c_to_html, text_to_html, html_to_text } from "./conversion.js"

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
  editable.addEventListener("blur", (event) => {
    event.target.innerHTML = text_to_html(event.target.innerText)
  })
  editable.addEventListener("focus", (event) => {
    event.target.innerText = html_to_text(event.target.innerHTML)
  })

  if (editable.classList.contains("header")) {
    editable.addEventListener("keydown", (event) => {
      if (event.key == "Enter") {
        event.preventDefault()
        event.target.blur()
      }
    })
  }
}

function addEditHandlersToC(c) {
  c.addEventListener("blur", (event) => {
    event.target.innerHTML = c_to_html(event.target.innerText)
  })
  c.addEventListener("focus", (event) => {
    event.target.innerText = html_to_text(event.target.innerHTML)
  })
}