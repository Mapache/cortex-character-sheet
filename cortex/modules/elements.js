import { init_event_handlers } from "./eventHandlers.js"
import { fetchHtml } from "./fetchHtml.js"
import { apply_data_style, apply_trait_group_style_to_trait } from "./traitGroupStyle.js"

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

function new_group(className) {
  let template = document.querySelector("." + className + ".template")
  let newGroup = template.cloneNode(true)
  newGroup.classList.remove("template")
  return newGroup
}

function add_child(parent, newGroup) {
  let children = parent.children
  let placeholder = children[children.length - 1]
  parent.insertBefore(newGroup, placeholder)
  init_event_handlers(newGroup)
  return newGroup
}

function add_group(event, newGroup) {
  return add_child(event.target.parentElement, newGroup)
}

export async function add_page(e) {
  let page = add_group(e, (await Template.page).newInstance())
  install_title_listener(page)
  const characterName = document.querySelector(".title").innerText // Get name from first page
  page.querySelector(".title").innerText = characterName
}

export async function add_trait_group(e) {
  let traitGroup = add_group(e, (await Template.traitGroup).newInstance())
  apply_data_style(traitGroup, "detailed")
}

export async function add_trait(e) {
  let trait = add_group(e, (await Template.trait).newInstance())
  let traitGroup = e.target.parentElement.parentElement
  apply_trait_group_style_to_trait(traitGroup, trait)
}

export function install_title_listeners() {
  let titles = document.getElementsByClassName("title")
  for (let title of titles) {
    title.addEventListener("input", function () {
      let characterName = title.innerText
      update_titles(characterName, title)
    })
  }
}

function install_title_listener(page) {
  let title = page.querySelector(".title")
  title.addEventListener("input", function () {
    let characterName = title.innerText
    update_titles(characterName, title)
  })
}

export function update_titles(characterName, excludingTitle) {
  let titles = document.getElementsByClassName("title")
  for (let title of titles) {
    if (title != excludingTitle) {
      title.innerText = characterName
    }
  }
  if (characterName == "NAME" || characterName.length == 0) {
    characterName = "Cortex Prime"
  }
  document.title = characterName + " Character Sheet"
}

export function remove_item(e) {
  let item = e.target.parentElement
  item.parentElement.removeChild(item)
}