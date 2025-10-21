import { html_to_text } from "./conversion.js"
import { defaultHighlightColor } from "./traitGroupStyle.js"

function get_path_from_element(elem) {
  let id = elem.id
  let path = ""
  while (id === "" && elem.parentElement != null) {
    id = elem.parentElement.id
    path = "/" + Array.prototype.indexOf.call(elem.parentElement.children, elem) + path
    elem = elem.parentElement
  }
  if (elem.parentElement == null) {
    id = ":root"
  }
  return id + path
}

function get_parent_with_class(element, c) {
  if (element === null) {
    return null;
  }

  if (element.classList.contains(c)) {
    return element;
  }

  return get_parent_with_class(element.parentElement, c)
}

// The V3 format inherited from the original project scanned every editable field that was not tagged for exclusion
// and saved their contents keyed by paths that listed the numerical index of each child relative to its parents.
// It was intimately tied to the HTML structure of the page, difficult to edit by hand, and a substantial portion of
// each file was taken up by keypaths. Saving in V3 is no longer supported, but V3 files should be readable.
function save_characterV3() {
  let json = {}
  let data = {}
  json.version = 3;
  inputs = document.querySelectorAll("input, textarea, img, div[contenteditable], h1[contenteditable], h2[contenteditable], c[contenteditable], span[contenteditable]")
  for (let input of inputs) {
    if (input.classList.contains("non-serialized") || input.classList.contains("no-print") || input.classList.contains("template")) {
      continue
    }
    let non_serialized_parent = get_parent_with_class(input.parentElement, "non-serialized") || get_parent_with_class(input.parentElement, "no-print") || get_parent_with_class(input.parentElement, "template")
    if (non_serialized_parent) {
      continue
    }

    let id = input.id
    let spell_parent = get_parent_with_class(input.parentElement, "spell")
    if (spell_parent && spell_parent.classList.contains("template")) {
      continue
    }
    if (spell_parent !== null) {
      id = path_to(input.parentElement, "spells") + "/" + input.id
    }
    else if (input.parentElement.id == "talent" || input.parentElement.id == "weapon" || input.parentElement.id == "ability" || input.parentElement.id == "critical-injury") {
      id = input.parentElement.parentElement.id + "/" + Array.prototype.indexOf.call(input.parentElement.parentElement.children, input.parentElement) + "/" + input.id
    }
    if (input.id === "") {
      id = get_path_from_element(input)
    }

    if (input.getAttribute("type") == "checkbox") {
      data[id] = input.checked
    }
    else if (input.tagName == "IMG") {
      data[id] = input.src
    }
    else if (input.tagName == "DIV" || input.tagName == "H1" || input.tagName == "H2" || input.tagName == "C" || input.tagName == "SPAN") {
      let contents = input.innerHTML
      if (contents != "Trait description.") { // Don't save default trait descriptions.
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
  let styledDivs = document.querySelectorAll("div[data-style]")
  for (let elem of styledDivs) {
    styles[get_path_from_element(elem)] = elem.getAttribute("data-style")
  }
  if (Object.keys(styles).length) {
    json.styles = styles
  }

  let classList = {}
  let customizedDivs = document.querySelectorAll("div[custom-classes]")
  for (let elem of customizedDivs) {
    classList[get_path_from_element(elem)] = elem.getAttribute("custom-classes")
  }
  if (Object.keys(classList).length) {
    json.classList = classList
  }

  let highlightColors = {}
  highlightColors[":root"] = document.querySelector(":root").getAttribute("highlight-color") ?? defaultHighlightColor
  let highlightedDivs = document.querySelectorAll("div[highlight-color]")
  for (let elem of highlightedDivs) {
    highlightColors[get_path_from_element(elem)] = elem.getAttribute("highlight-color")
  }
  if (Object.keys(highlightColors).length) {
    json.highlightColors = highlightColors
  }

  return json
}

export function characterName() {
  return html_to_text(document.querySelector("#character-name").innerHTML)
}

// The V4 format extracts the semantic structure of a character and saves it as a few top-level standalone properties
// and a tree of arrays containing /pages/columns/groups/traits/[title, value, description]. It is designed to be
// uncoupled from the page's HTML structure allowing for easier changes to either side independently, relatively easy
// to edit by hand, and more space-efficient than V3 by not requiring keypaths and omitting any elements unchanged
// from their default values.
function save_characterV4() {
  let json = {}
  json.version = 4
  json.characterName = characterName()
  json.description = html_to_text(document.querySelector("#description").innerHTML)

  let traitsData = []
  let pages = document.querySelector("#pages")
  for (let page of pages.querySelectorAll(".page")) {
    let pageData = []
    for (let column of page.querySelectorAll(".page-column")) {
      let columnData = []
      for (let traitGroup of column.querySelectorAll(".trait-group")) {
        let traitGroupData = []
        let title = html_to_text(traitGroup.querySelector(".header").innerHTML)
        let style = traitGroup.getAttribute("data-style")
        let color = traitGroup.getAttribute("highlight-color")
        if (color == null) {
          traitGroupData.push([title, style])
        } else {
          traitGroupData.push([title, style, color])
        }
        for (let traitGroupColumn of traitGroup.querySelectorAll(".trait-column")) {
          let traitGroupColumnData = []
          for (let trait of traitGroupColumn.querySelectorAll(".trait")) {
            let name = html_to_text(trait.querySelector(".trait-name").innerHTML)
            let value = html_to_text(trait.querySelector(".trait-value c").innerHTML)
            let description = html_to_text(trait.querySelector(".trait-description").innerHTML)
            if (description == "Trait description.") {
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

export function save_character() {
  return save_characterV4()
}