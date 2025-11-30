import { diceToHtml, textToHtml } from "./conversion.js"
import { didSwitchDisplayedCharacterSheet, willSwitchDisplayedCharacterSheet } from "./displayedCharacter.js"
import { addElementOfType, updateTitles } from "./elements.js"
import { applyDataStyle, applyHighlightColor, defaultHighlightColor, globalHighlightColorPicker, updateTraitGroupDisplay } from "./traitGroupStyle.js"

export async function displayCharacterJson(json) {
  willSwitchDisplayedCharacterSheet()
  nukeDisplayedCharacter()
  let version = json.version
  switch (version) {
    case 3:
      await displayCharacterJsonV3(json)
      break
    case 4:
      await displayCharacterJsonV4(json)
      break
    default:
      console.error("Unknown data format version " + version)
  }
  didSwitchDisplayedCharacterSheet()
}

export function nukeDisplayedCharacter() {
  // Nuke all but the first page.
  for (let page of Array.from(document.querySelectorAll(".page:not(.template)")).slice(1)) {
    page.remove()
  }
  // Nuke all trait groups.
  for (let traitGroup of document.querySelectorAll(".trait-group:not(.template)")) {
    traitGroup.remove()
  }
  // Reset name & description.
  updateTitles("NAME")
  document.querySelector("#description").innerHTML = "Description"
}

async function elementForPath(path) {
  let parts = path.split("/")
  if (parts[0] !== ":root" && parts[0][0] !== "#") {
    parts[0] = `#${parts[0]}`
  }
  return await elementForPathParts(parts)
}

async function elementForPathParts(parts) {
  let current = document.querySelector(parts[0])
  for (const part of parts.slice(1)) {
    try {
      current = current.querySelector("#" + part)
    } catch {
      current = current.children[part]
    }
    if (!current) {
      console.error("Failed to find: " + path)
      return null
    }
    if (current.classList.contains("add-item")) {
      current = await addElementOfType(current.parentElement, current.getAttribute("data-child-type"))
    }
  }
  // console.debug(current)
  return current
}

async function loadHighlightColors(highlightColors) {
  let globalHighlightColor = defaultHighlightColor
  if (highlightColors) {
    for (const path in highlightColors) {
      const elem = await elementForPath(path)
      const highlightColor = highlightColors[path]
      applyHighlightColor(elem, highlightColor)

      if (path === ":root") {
        globalHighlightColor = highlightColor
      }
    }
  }
  globalHighlightColorPicker.value = globalHighlightColor
}

// MARK: V3

// See notes about file formats in save.js. Loading V3 characters is theoretically supported but not actively tested.
async function displayCharacterJsonV3(json) {
  if (json.version != 3) {
    console.error("Incorrect format version: Expected 3, got", json.version)
    return
  }
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
      element = await elementForPath(path)
    }

    if (element == null) continue

    if (element.getAttribute("type") === "checkbox") {
      element.checked = value
    }
    else if (element.tagName === "IMG") {
      element.src = value
    }
    else if (element.tagName === "DIV" || element.tagName === "H1" || element.tagName === "H2" || element.tagName === "D" || element.tagName === "SPAN") {
      element.innerHTML = textToHtml(value)
    }
    else {
      element.value = value
    }
    if (object != null) {
      if (object.style != null) {
        applyDataStyle(element, object.style)
      }
      if (object.x != null) {
        element.setAttribute("data-x", object.x)
        element.setAttribute("data-y", object.y)
        element.setAttribute("data-zoom", object.zoom)
        element.style.transform = "translate(" + object.x + "cm, " + object.y + "cm) scale(" + object.zoom + ", " + object.zoom + ")"
      }
    }
    element.onblur?.({ target: element })
  }

  if (json.styles) {
    for (let path in json.styles) {
      let elem = await elementForPath(path)
      let style = json.styles[path]
      applyDataStyle(elem, style)
    }
  }

  if (json.classList) {
    for (let path in json.classList) {
      let elem = await elementForPath(path)
      let classList = json.classList[path]
      elem.setAttribute("custom-classes", classList)
      elem.classList.add(classList)
    }
  }

  await loadHighlightColors(json.highlightColors)

  updateTitles(data["character-name"])
}

function setText(parent, selector, text) {
  parent.querySelector(selector).innerHTML = textToHtml(text)
}

// MARK: V4

// See notes about file formats in save.js.
async function displayCharacterJsonV4(json) {
  if (json.version != 4) {
    console.error("Incorrect format version: Expected 4, got", json.version)
    return
  }
  setText(document, "#character-name", json.characterName)
  setText(document, "#description", json.description)

  for (let [pageIndex, pageData] of json.traits.entries()) {
    for (let [columnIndex, columnData] of pageData.entries()) {
      for (let [traitGroupIndex, traitGroupData] of columnData.entries()) {
        // columnIndex + 1 is to skip the header div.
        let traitGroup = await elementForPathParts(["#pages", pageIndex, columnIndex + 1, traitGroupIndex])
        let [title, style, color] = traitGroupData[0]
        setText(traitGroup, ".header", title)
        applyDataStyle(traitGroup, style)
        applyHighlightColor(traitGroup, color)
        for (let [traitGroupColumnIndex, traitGroupColumnData] of traitGroupData.slice(1).entries()) {
          for (let [traitIndex, traitData] of traitGroupColumnData.entries()) {
            // traitGroupColumnIndex + 2 is to skip the context menu button and the header.
            let trait = await elementForPathParts(["#pages", pageIndex, columnIndex + 1, traitGroupIndex, traitGroupColumnIndex + 2, traitIndex])
            let [name, value] = traitData
            setText(trait, ".trait-name", name)
            trait.querySelector(".trait-value").innerHTML = diceToHtml(value)
            if (traitData.length > 2) {
              let description = traitData.slice(2).join("\n")
              setText(trait, ".trait-description", description)
            }
          }
        }
        updateTraitGroupDisplay(traitGroup)
      }
    }
  }

  await loadHighlightColors(json.highlightColors)

  updateTitles(json.characterName)
}

// Load the character specified by a URL path
export async function displayCharacterJsonFromPath(path) {
  fetch(path)
    .then((response) => response.json())
    .then((json) => displayCharacterJson(json))
}