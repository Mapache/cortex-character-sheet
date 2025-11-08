import { CampaignPermissions, cloud } from "./cloud.js"
import { c_to_html } from "./conversion.js"
import { Flags } from "./flags.js"
import { formatAbsoluteTime } from "./formatting.js"
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
      const messages = await cloud.fetchOlderMessages()
      this.showMessages(messages, true)
      await cloud.subscribeToNewerMessages(this, messages.at(-1)?.saved)

      document.getElementById("message-post").onclick = (e) => {
        this.postMessage(e)
      }

      this.diceTable = document.getElementById("dice")
      const initialDiceRow = document.getElementById("die-0")
      this.diceRowTemplate = initialDiceRow.cloneNode(true)
      this.installDieSizeBlurHandler(initialDiceRow)
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

  // Replaces all displayed messages with the currently loaded messages
  showAllMessages() {
    let messages = Object.values(this.messages)
    messages.sort((a, b) => a.saved - b.saved)
    const htmlMessages = messages.map(htmlForMessage)
    this.messagesDiv.replaceChildren(...htmlMessages)
  }

  async showOlderMessages() {
    if (this.oldestMessageTimestamp) {
      this.showMessages(await cloud.fetchOlderMessages(this.oldestMessageTimestamp), true)
    } else {
      // TODO: Update UI to convey we have run out of older messages
    }
  }

  // MARK: Edit Handlers

  async postMessage(e) {
    const messageText = document.getElementById("message-text")
    const text = messageText.value

    let dice = []
    for (const dieInput of document.querySelectorAll(".die-input")) {
      const label = dieInput.querySelector("input").value
      let size = null
      switch (dieInput.querySelector("c").innerText) {
        case "4":
          size = 4
          break
        case "6":
          size = 6
          break
        case "8":
          size = 8
          break
        case "0":
          size = 10
          break
        case "2":
          size = 12
          break
        default:
          // Don't push ø sizes, but we'll always have at least one visible.
          continue
      }
      dice.push([label, size])
    }

    messageText.value = ""
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.id == "die-0") {
        dieInput.querySelector("input").value = ""
        dieInput.querySelector("c").innerText = "∅"
      } else {
        dieInput.remove()
      }
    }

    await cloud.postMessageComponents(text, dice)
    this.messagesDiv.scrollTo({
      top: this.messagesDiv.scrollHeight,
      behavior: "smooth"
    })
  }

  installDieSizeBlurHandler(node) {
    node.querySelector("c").addEventListener("blur", (e) => {
      this.dieSizeBlur(e)
    })
  }

  dieSizeBlur(e) {
    let convertedText = c_to_html(e.target.innerText)
    switch (convertedText[0]) {
      case "4":
      case "6":
      case "8":
      case "0":
      case "2":
        convertedText = convertedText[0]
        break
      default:
        convertedText = "∅"
    }
    e.target.innerHTML = convertedText

    let allDieInputsFull = true
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.querySelector("c").innerText === "∅") {
        allDieInputsFull = false
      }
    }
    if (allDieInputsFull) {
      const newRow = this.diceRowTemplate.cloneNode(true)
      newRow.id = `die-${this.diceTable.childElementCount}`
      this.diceTable.appendChild(newRow)
      this.installDieSizeBlurHandler(newRow)
    }
  }

  // MARK: Listeners

  showMessage(message) {
    this.showMessages([message])
  }

  showMessages(messages, areOld = false) {
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
      this.oldestMessageTimestamp = messages[0]?.saved
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
  const html = document.createElement("li")
  html.id = htmlIdForMessage(message)
  html.classList.add("message")
  html.innerText = `${formatAbsoluteTime(message.saved)} : ${message.text}`

  if (message.dice.length > 0) {
    const table = document.createElement("table")
    for (const die of message.dice) {
      const row = document.createElement("tr")
      row.innerHTML =
        `<td class="trait"><h2 class="trait-name">${die.label}</h2></td>` +
        `<td><c>${die.size % 10}</c> → <span class="d${die.size}">${die.result}</span></td>`
      table.appendChild(row)
    }
    html.appendChild(table)
  }

  return html
}

export const messages = new Messages()