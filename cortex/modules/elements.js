import { addEditHandlers } from "./eventHandlers.js"
import { fetchHtml } from "./fetchHtml.js"
import { apply_data_style, apply_trait_group_style_to_trait } from "./traitGroupStyle.js"

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

function addElement(event, newElement) {
  return addChild(event.target.parentElement, newElement)
}

export async function add_page(e) {
  let page = addElement(e, (await Template.page).newInstance())
  page.querySelector(".title").innerText = currentCharacterName()
  installTitleListeners(page)

  updatePagePlaceholderControl()
}

export async function add_trait_group(e) {
  let traitGroup = addElement(e, (await Template.traitGroup).newInstance())
  apply_data_style(traitGroup, "detailed")

  updatePagePlaceholderControl()
}

export async function add_trait(e) {
  let trait = addElement(e, (await Template.trait).newInstance())
  let traitGroup = e.target.parentElement.parentElement
  apply_trait_group_style_to_trait(traitGroup, trait, true)
}

// MARK: Remove Elements

export function remove_item(e) {
  let item = e.target.parentElement
  item.remove()
}

export function remove_last_page(e) {
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
    pagePlaceholder.onclick = remove_last_page
  } else {
    pagePlaceholder.classList.remove("remove-last-page")
    pagePlaceholder.onclick = add_page
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

export function updateDocumentTitle(characterName) {
  if (characterName === "NAME" || characterName.length === 0) {
    characterName = "Cortex Prime"
  }
  document.title = characterName + " Character Sheet"
}

export function currentCharacterName() {
	return document.querySelector(".title").innerText // Get name from first page
}