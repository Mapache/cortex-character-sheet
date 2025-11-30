import { html_to_text } from "./conversion.js"
import { defaultHighlightColor } from "./traitGroupStyle.js"

function pathForElement(elem) {
  let id = elem.id
  let path = ""
  while (id === "" && elem.parentElement != null) {
    id = elem.parentElement.id
    path = "/" + Array.prototype.indexOf.call(elem.parentElement.children, elem) + path
    elem = elem.parentElement
  }
  if (!elem.parentElement) {
    id = ":root"
  }
  return id + path
}

// The V3 format inherited from the original project scanned every editable field that was not tagged for exclusion
// and saved their contents keyed by paths that listed the numerical index of each child relative to its parents.
// It was intimately tied to the HTML structure of the page, difficult to edit by hand, and a substantial portion of
// each file was taken up by keypaths. Saving in V3 is no longer supported, but V3 files should be readable.
function jsonForDisplayedCharacterV3() {
  let json = {}
  let data = {}
  json.version = 3
  const inputs = document.querySelectorAll("input, textarea, img, div[contenteditable], h1[contenteditable], h2[contenteditable], d[contenteditable], span[contenteditable]")
  for (const input of inputs) {
    if (input.classList.contains("non-serialized") || input.classList.contains("no-print") || input.classList.contains("template")) {
      continue
    }
    const non_serialized_parent = input.parentElement.closest("non-serialized") || input.parentElement.closest("no-print") || input.parentElement.closest("template")
    if (non_serialized_parent) {
      continue
    }

    const id = input.id
    const spell_parent = input.parentElement.closest("spell")
    if (spell_parent && spell_parent.classList.contains("template")) {
      continue
    }
    if (spell_parent) {
      id = path_to(input.parentElement, "spells") + "/" + input.id
    }
    else if (input.parentElement.id === "talent" || input.parentElement.id === "weapon" || input.parentElement.id === "ability" || input.parentElement.id === "critical-injury") {
      id = input.parentElement.parentElement.id + "/" + Array.prototype.indexOf.call(input.parentElement.parentElement.children, input.parentElement) + "/" + input.id
    }
    if (input.id === "") {
      id = pathForElement(input)
    }

    if (input.getAttribute("type") === "checkbox") {
      data[id] = input.checked
    }
    else if (input.tagName === "IMG") {
      data[id] = input.src
    }
    else if (input.tagName === "DIV" || input.tagName === "H1" || input.tagName === "H2" || input.tagName === "D" || input.tagName === "SPAN") {
      const contents = input.innerHTML
      if (contents !== "Trait description.") { // Don't save default trait descriptions.
        data[id] = html_to_text(contents)
      }
    }
    else {
      data[id] = input.value
    }
    if (input.getAttribute("data-x") !== null) {
      data[id] = { value: data[id] }
      data[id].x = input.getAttribute("data-x")
      data[id].y = input.getAttribute("data-y")
      data[id].zoom = input.getAttribute("data-zoom")
    }
    if (input.getAttribute("data-style") !== null) {
      data[id] = { value: data[id] }
      data[id].style = input.getAttribute("data-style")
    }
  }
  json.data = data

  let styles = {}
  const styledDivs = document.querySelectorAll("div[data-style]")
  for (const elem of styledDivs) {
    styles[pathForElement(elem)] = elem.getAttribute("data-style")
  }
  if (Object.keys(styles).length) {
    json.styles = styles
  }

  let classList = {}
  const customizedDivs = document.querySelectorAll("div[custom-classes]")
  for (const elem of customizedDivs) {
    classList[pathForElement(elem)] = elem.getAttribute("custom-classes")
  }
  if (Object.keys(classList).length) {
    json.classList = classList
  }

  let highlightColors = {}
  highlightColors[":root"] = document.querySelector(":root").getAttribute("highlight-color") ?? defaultHighlightColor
  const highlightedDivs = document.querySelectorAll("div[highlight-color]")
  for (const elem of highlightedDivs) {
    highlightColors[pathForElement(elem)] = elem.getAttribute("highlight-color")
  }
  if (Object.keys(highlightColors).length) {
    json.highlightColors = highlightColors
  }

  return json
}

function extract(parent, selector) {
  return html_to_text(parent.querySelector(selector).innerHTML)
}

export function characterName() {
  return extract(document, "#character-name")
}

// The V4 format extracts the semantic structure of a character and saves it as a few top-level standalone properties
// and a tree of arrays containing /pages/columns/groups/traits/[title, value, description]. It is designed to be
// uncoupled from the page's HTML structure allowing for easier changes to either side independently, relatively easy
// to edit by hand, and more space-efficient than V3 by not requiring keypaths and omitting any elements unchanged
// from their default values.
function jsonForDisplayedCharacterV4() {
  let json = {}
  json.version = 4
  json.characterName = characterName()
  json.description = extract(document, "#description")

  let traitsData = []
  const pages = document.querySelector("#pages")
  for (const page of pages.querySelectorAll(".page")) {
    let pageData = []
    for (const column of page.querySelectorAll(".page-column")) {
      let columnData = []
      for (const traitGroup of column.querySelectorAll(".trait-group")) {
        let traitGroupData = []
        const title = extract(traitGroup, ".header")
        const style = traitGroup.getAttribute("data-style")
        const color = traitGroup.getAttribute("highlight-color")
        if (color) {
          traitGroupData.push([title, style, color])
        } else {
          traitGroupData.push([title, style])
        }
        for (const traitGroupColumn of traitGroup.querySelectorAll(".trait-column")) {
          let traitGroupColumnData = []
          for (const trait of traitGroupColumn.querySelectorAll(".trait")) {
            const name = extract(trait, ".trait-name")
            const value = extract(trait, ".trait-value")
            const description = extract(trait, ".trait-description")
            if (description === "Trait description.") {
              // Don't save default trait descriptions.
              traitGroupColumnData.push([name, value])
            } else {
              traitGroupColumnData.push([name, value].concat(description.trim().split("\n")))
            }
          }
          if (traitGroupColumnData.length > 0) {
            traitGroupData.push(traitGroupColumnData)
          }
        }
        columnData.push(traitGroupData)
      }
      pageData.push(columnData)
    }
    traitsData.push(pageData)
  }
  json.traits = traitsData

  let highlightColors = {}
  highlightColors[":root"] = document.querySelector(":root").getAttribute("highlight-color") ?? defaultHighlightColor
  json.highlightColors = highlightColors

  return json
}

export function jsonForDisplayedCharacter() {
  return jsonForDisplayedCharacterV4()
}