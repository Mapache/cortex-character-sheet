import { CampaignPermissions, cloud } from "./cloud.js"
import { Flags } from "./flags.js"
import { formatRelativeTime } from "./formatting.js"
import { menu, menuEntry, menuDivider, menuLabel, menuTextInput } from "./menu.js"
import { Modal } from "./modal.js"
import { ToggleableStyle } from "./toggleableStyle.js"

const messagingVisible = new ToggleableStyle(
  "#messaging",
  "messaging-visible",
  "messaging-hidden",
  `
    #pages {
      margin-left: 220px;
    }
	`,
  `	`,
  false)

class Messages {
  constructor() {
    this.messages = null
    this.messagesDiv = document.querySelector("#messages")
  }

  // MARK: Visibility

  async show() {
    this.visible = true
    messagingVisible.enable()

    if (!this.messages) {
      this.messages = await cloud.fetchMessages()
      console.log(this.messages)
      for (const message of this.messages) {
        this.messagesDiv.appendChild(this.htmlForMessage(message))
      }
    }
  }

  hide() {
    this.visible = false
    messagingVisible.disable()
  }

  setVisible(visible) {
    if (visible) {
      this.show()
    } else {
      this.hide()
    }
  }

  toggle() {
    this.setVisible(!this.visible)
  }

  // MARK: Rendering

  htmlForMessage(message) {
    const div = document.createElement("li")
    div.classList.add("message")
    div.innerText = `${formatRelativeTime(message.saved)} : ${message.text}`
    return div
  }
}

export const messages = new Messages()