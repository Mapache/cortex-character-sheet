import { fetchHtml } from "./fetchHtml.js"

let currentModal = null
export function close_modal(e) {
  if (currentModal != null) {
    currentModal.hide()
    currentModal = null
  }
}

const modalBackground = document.getElementById("modal-bg")

function showModalBackground() {
  modalBackground.style.display = "block"
}

function hideModalBackground() {
  modalBackground.style.display = "none"
}

export class Modal {
  constructor(modal, callback) {
    this.modal = modal
    this.callback = callback
  }

  static async build(id, callback) {
    const modal = await fetchHtml(`/modals/${id}.html`)
    return new Modal(modal, callback)
  }

  show(e) {
    this.showAt(e.pageX, e.pageY)
  }

  showAt(left, top) {
    currentModal = this

    showModalBackground()
    modalBackground.insertAdjacentElement("afterend", this.modal)
    this.modal.style.display = "block"
    this.modal.style.left = left
    this.modal.style.top = top

    let input = this.modal.querySelector("input")
    if (input != null) {
      input.select()
    }
  }

  hide() {
    this.modal.style.display = "none"
    this.modal.remove()

    hideModalBackground()

    if (this.callback != null) {
      this.callback()
    }
  }
}