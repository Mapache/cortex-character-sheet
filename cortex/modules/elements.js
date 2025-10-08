import { init_event_handlers } from "./eventHandlers.js"
import { fetchHtml } from "./fetchHtml.js"
import { apply_data_style } from "./traitGroupStyle.js"

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
  install_title_listeners() // TODO: Switch to install_title_listener(page) after setting up the first page's listener.
}

export async function add_trait_group(e) {
  let traitGroup = add_group(e, (await Template.traitGroup).newInstance())
  apply_data_style(traitGroup, "detailed")
}

export async function add_trait(e) {
  add_group(e, (await Template.trait).newInstance())
}

export function install_title_listeners() {
  let titles = document.getElementsByClassName("title")
  for (let title of titles) {
    title.addEventListener("input", function () {
      let character_name = title.innerText
      update_titles(character_name, title)
    })
  }
}

function install_title_listener(page) {
  let title = page.getElementsByClassName("title")
  for (let title of titles) {
    title.addEventListener("input", function () {
      let character_name = title.innerText
      update_titles(character_name, title)
    })
  }
}

export function update_titles(character_name, excluding_title) {
  let titles = document.getElementsByClassName("title")
  for (let title of titles) {
    if (title != excluding_title) {
      title.innerText = character_name
    }
  }
  if (character_name == "NAME" || character_name.length == 0) {
    character_name = "Cortex Prime"
  }
  document.title = character_name + " Character Sheet"
}

export function remove_item(e) {
  let item = e.target.parentElement
  item.parentElement.removeChild(item)
}