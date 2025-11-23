import { fetchHtml } from "./fetchHtml.js"

let currentModal = null
export function hideCurrentModal(e) {
  currentModal?.hide()
  currentModal = null
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

  showAtEvent(e) {
    this.showAt(e.pageX, e.pageY)
  }

  showAt(left, top) {
    this.modal.style.left = left + "px"
    this.modal.style.top = top + "px"
    this.show()
  }

  show() {
    currentModal = this

    showModalBackground()
    modalBackground.after(this.modal)
    this.modal.style.display = "block"

    this.modal.querySelector("input")?.select()
  }

  hide() {
    this.modal.style.display = "none"
    this.modal.remove()

    hideModalBackground()

    this.callback?.()
  }
}

// A generic information-presentation modal dialog
export const infoModal = await Modal.build("info-modal")
infoModal.title = infoModal.modal.querySelector("#title")
infoModal.info = infoModal.modal.querySelector("#info")