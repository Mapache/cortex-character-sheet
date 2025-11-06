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
      this.messages = {}
      this.showMessages(await cloud.fetchMessages())
      console.log(this.messages) //!
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

  // MARK: Listeners

  showMessage(message) {
    this.showMessages([message])
  }

  showMessages(messages, areOld = false) {
    console.log("showMessages")
    console.log(messages) //!

    const newMessages = messages.filter((message) => {
      let messageIsNew = true
      if (this.messages[message.id]) {
        // This is an update to a previously-displayed message
        messageIsNew = false
        const oldHtml = document.getElementById(htmlIdForMessage(message))
        oldHtml.replaceWith(htmlForMessage(message))
      }
      // Always store the new message
      this.messages[message.id] = message
      return messageIsNew
    })

    const html = newMessages.map(htmlForMessage)
    if (areOld) {
      this.messagesDiv.prepend(...html)
    } else {
      this.messagesDiv.append(...html)
    }
  }

}

// MARK: Rendering

function htmlIdForMessage(message) {
  return `message-${message.id}`
}

function htmlForMessage(message) {
  console.log("htmlForMessage")
  console.log(message) //!
  const html = document.createElement("li")
  html.id = htmlIdForMessage(message)
  html.classList.add("message")
  html.innerText = `${formatRelativeTime(message.saved)} : ${message.text}`
  return html
}

export const messages = new Messages()