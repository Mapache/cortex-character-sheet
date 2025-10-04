import { c_to_html, text_to_html, html_to_text } from "./conversion.js"

export function init_event_handlers(parent) {
  let editables = parent.querySelectorAll("div[contenteditable], h1[contenteditable], h2[contenteditable]")
  for (let editable of editables) {
    add_event_handlers(editable)
  }

  // C elements get limited conversion; we don't want to add nested C elements.
  let cs = parent.querySelectorAll("c[contenteditable]")
  for (let c of cs) {
    c.addEventListener("blur", function (event) {
      event.target.innerHTML = c_to_html(event.target.innerText)
    })
    c.addEventListener("focus", function (event) {
      event.target.innerText = html_to_text(event.target.innerHTML)
    })
  }
}

function add_event_handlers(editable) {
  editable.addEventListener("blur", function (event) {
    event.target.innerHTML = text_to_html(event.target.innerText)
  })
  editable.addEventListener("focus", function (event) {
    event.target.innerText = html_to_text(event.target.innerHTML)
  })

  if (editable.classList.contains("header")) {
    editable.addEventListener("keydown", function (event) {
      if (event.key == "Enter") {
        event.preventDefault()
        event.target.blur()
      }
    })
  }
}