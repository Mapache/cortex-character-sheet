
import { update_titles } from "./elements.js"
import { c_to_html, text_to_html } from "./conversion.js"
import { apply_data_style, update_trait_group_display, apply_highlight_color, defaultHighlightColor } from "./traitGroupStyle.js"

export async function load_character(json) {
  nuke_character()
  let version = json.version
  switch (version) {
    case 3:
      await load_characterV3(json)
      break
    case 4:
      await load_characterV4(json)
      break
    default:
      console.error("Unknown data format version " + version)
  }
}

export function nuke_character() {
  // Nuke all but the first page.
  for (let page of Array.from(document.querySelectorAll(".page:not(.template)")).slice(1)) {
    page.remove()
  }
  // Nuke all trait groups.
  for (let traitGroup of document.querySelectorAll(".trait-group:not(.template)")) {
    traitGroup.remove()
  }
  // Reset name & description.
  update_titles("NAME", null)
  document.querySelector("#description").innerHTML = "Description"
}

async function get_element_from_path(path) {
  let parts = path.split("/")
  return await get_element_from_parts(parts)
}

async function get_element_from_parts(parts) {
  let current = (parts[0] === ":root") ? document.querySelector(":root") : document.querySelector("div#" + parts[0])
  for (let p = 1; p < parts.length; p++) {
    try {
      current = current.querySelector("#" + parts[p])
    } catch {
      current = current.children[parts[p]]
    }
    if (current == null) {
      console.error("Failed to find: " + path)
    }
    if (current.getAttribute("data-onload") !== null) {
      // console.debug("Creating new element")
      await window[current.getAttribute("data-onload")]({ target: current })
      p = p - 1
      current = current.parentElement
    }
  }
  // console.debug(current)
  return current
}

async function load_highlight_colors(highlightColors) {
  let globalHighlightColor = defaultHighlightColor
  if (highlightColors != null) {
    for (let path in highlightColors) {
      let elem = await get_element_from_path(path)
      let highlightColor = highlightColors[path]
      apply_highlight_color(elem, highlightColor)

      if (path === ":root") {
        globalHighlightColor = highlightColor
      }
    }
  }
  let colorPicker = document.getElementById("global-highlight-picker")
  colorPicker.value = globalHighlightColor
}

// See notes about file formats in save.js. Loading V3 characters is theoretically supported but not actively tested.
async function load_characterV3(json) {
  let data = json.data
  for (let path in data) {
    let object = null
    let value = null
    if (typeof (data[path]) === "object") {
      object = data[path]
      value = object.value
    } else {
      value = data[path]
    }
    let element = null
    if (!path.includes("/")) {
      element = document.getElementById(path)
    }
    else {
      element = await get_element_from_path(path)
    }

    if (element == null) continue

    if (element.getAttribute("type") === "checkbox") {
      element.checked = value
    }
    else if (element.tagName === "IMG") {
      element.src = value
    }
    else if (element.tagName === "DIV" || element.tagName === "H1" || element.tagName === "H2" || element.tagName === "C" || element.tagName === "SPAN") {
      element.innerHTML = text_to_html(value)
    }
    else {
      element.value = value
    }
    if (object != null) {
      if (object.style != null) {
        apply_data_style(element, object.style)
      }
      if (object.x != null) {
        element.setAttribute("data-x", object.x)
        element.setAttribute("data-y", object.y)
        element.setAttribute("data-zoom", object.zoom)
        element.style.transform = "translate(" + object.x + "cm, " + object.y + "cm) scale(" + object.zoom + ", " + object.zoom + ")"
      }
    }
    if (element.onblur != null) {
      element.onblur({ target: element })
    }
  }

  if (json.styles != null) {
    for (let path in json.styles) {
      let elem = await get_element_from_path(path)
      let style = json.styles[path]
      apply_data_style(elem, style)
    }
  }

  if (json.classList != null) {
    for (let path in json.classList) {
      let elem = await get_element_from_path(path)
      let classList = json.classList[path]
      elem.setAttribute("custom-classes", classList)
      elem.classList.add(classList)
    }
  }

  await load_highlight_colors(json.highlightColors)

  update_titles(data["character-name"], null)
}

// See notes about file formats in save.js.
async function load_characterV4(json) {
  if (json.version != 4) {
    return
  }
  let characterName = text_to_html(json.characterName)
  document.querySelector("#character-name").innerHTML = text_to_html(characterName)
  document.querySelector("#description").innerHTML = text_to_html(json.description)

  for (let [pageIndex, pageData] of json.traits.entries()) {
    for (let [columnIndex, columnData] of pageData.entries()) {
      for (let [traitGroupIndex, traitGroupData] of columnData.entries()) {
        let traitGroup = await get_element_from_parts(["pages", pageIndex, columnIndex + 1, traitGroupIndex])
        let [title, style, color] = traitGroupData[0]
        traitGroup.querySelector(".header").innerHTML = text_to_html(title)
        apply_data_style(traitGroup, style)
        apply_highlight_color(traitGroup, color)
        for (let [traitGroupColumnIndex, traitGroupColumnData] of traitGroupData.slice(1).entries()) {
          for (let [traitIndex, traitData] of traitGroupColumnData.entries()) {
            let trait = await get_element_from_parts(["pages", pageIndex, columnIndex + 1, traitGroupIndex, traitGroupColumnIndex + 2, traitIndex])
            let [name, value] = traitData
            trait.querySelector(".trait-name").innerHTML = text_to_html(name)
            trait.querySelector(".trait-value c").innerHTML = c_to_html(value)
            if (traitData.length > 2) {
              let description = traitData.slice(2).join("\n")
              trait.querySelector(".trait-description").innerHTML = text_to_html(description)
            }
          }
        }
        update_trait_group_display(traitGroup)
      }
    }
  }

  await load_highlight_colors(json.highlightColors)

  update_titles(characterName, null)
}

// Load the character specified by a URL path
export async function load_character_path(path) {
  fetch(path)
    .then((response) => response.json())
    .then((json) => load_character(json))
}