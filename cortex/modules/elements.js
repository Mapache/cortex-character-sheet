import { currentCharacterName, updateDocumentTitle } from "./displayedCharacter.js"
import { addEditHandlers } from "./eventHandlers.js"
import { fetchHtml } from "./fetchHtml.js"
import { applyDataStyle, applyTraitGroupStyleToTrait } from "./traitGroupStyle.js"

// MARK: Template

class Template {
  constructor(element) {
    this.element = element
  }

  newInstance() {
    return this.element.cloneNode(true)
  }

  static async build(templateClass) {
    const element = await fetchHtml(`/elements/${templateClass}.html`)
    return new Template(element)
  }

  static page = Template.build("page")
  static traitGroup = Template.build("trait-group")
  static trait = Template.build("trait")

}

// MARK: Add Elements

function addChild(parent, newElement) {
  let children = parent.children
  let placeholder = children[children.length - 1]
  parent.insertBefore(newElement, placeholder)
  addEditHandlers(newElement)
  return newElement
}

function addElement(parent, template) {
  return addChild(parent, template.newInstance())
}

export async function addElementOfType(event, childType) {
  const parent = event.target.parentElement
  switch (childType) {
    case "page":
      addPageToParent(parent)
      break
    case "trait-group":
      addTraitGroupToParent(parent)
      break
    case "trait":
      addTraitToParent(parent)
      break
    default:
      console.error("Attempting to add unknown child element type", childType)
  }
}

export async function addPage(event) {
  const parent = event.target.parentElement
  addPageToParent(parent)
}

export async function addPageToParent(parent) {
  let page = addElement(parent, await Template.page)
  page.querySelector(".title").innerText = currentCharacterName()
  installTitleListeners(page)

  updatePagePlaceholderControl()
}

export async function addTraitGroup(event) {
  const parent = event.target.parentElement
  addTraitGroupToParent(parent)
}

export async function addTraitGroupToParent(parent) {
  let traitGroup = addElement(parent, await Template.traitGroup)
  applyDataStyle(traitGroup, "detailed")

  updatePagePlaceholderControl()
}

export async function addTrait(event) {
  const parent = event.target.parentElement
  addTraitToParent(parent)
}

export async function addTraitToParent(parent) {
  let trait = addElement(parent, await Template.trait)
  let traitGroup = parent.parentElement
  applyTraitGroupStyleToTrait(traitGroup, trait, true)
}

// MARK: Remove Elements

export function removeItem(e) {
  let item = e.target.parentElement
  item.remove()
}

export function removeLastPage(e) {
  const pagePlaceholder = document.getElementById("page-placeholder")
  const pages = document.getElementById("pages")
  const lastPage = pagePlaceholder.previousElementSibling
  // Minimum pages length is 2, the first page and the page-placeholder.
  if (pages.children.length > 2 && lastPage.querySelectorAll(".trait-group").length === 0) {
    lastPage.remove()
  } else {
    console.error("Attempting to remove non-empty page!")
  }
  updatePagePlaceholderControl()
}

export function updatePagePlaceholderControl() {
  const pagePlaceholder = document.getElementById("page-placeholder")
  const pages = document.getElementById("pages")
  const lastPage = pagePlaceholder.previousElementSibling
  // Minimum pages length is 2, the first page and the page-placeholder.
  if (pages.children.length > 2 && lastPage.querySelectorAll(".trait-group").length === 0) {
    pagePlaceholder.classList.add("remove-last-page")
    pagePlaceholder.onclick = removeLastPage
  } else {
    pagePlaceholder.classList.remove("remove-last-page")
    pagePlaceholder.onclick = addPage
  }
}

// MARK: Title Listeners

export function installTitleListeners(parent) {
  const titles = parent.querySelectorAll(".title")
  for (const title of titles) {
    title.addEventListener("input", (e) => {
      // Update every other title in sync.
      const characterName = title.innerText
      updateTitles(characterName, title)
    })
    title.addEventListener("blur", (e) => {
      // Strip extraneous formatting from the edited title.
      title.innerText = title.innerText
    })
  }
}

export function updateTitles(characterName, excludingTitle) {
  let titles = document.querySelectorAll(".title")
  for (let title of titles) {
    if (title !== excludingTitle) {
      title.innerText = characterName
    }
  }
  updateDocumentTitle(characterName)
}