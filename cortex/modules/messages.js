import { asyncMap, asyncFilter } from "./async.js"
import { CampaignPermissions, cloud } from "./cloud.js"
import { noDiePlaceholder, c_to_html, html_to_text } from "./conversion.js"
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
      this.scrollToBottom()

      document.getElementById("message-post").onclick = (e) => {
        this.postMessage(e)
      }

      this.diceTable = document.getElementById("dice")
      const initialDiceRow = document.getElementById("die-0")
      this.diceRowTemplate = initialDiceRow.cloneNode(true)
      this.installDieSizeEditHandlers(initialDiceRow)
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

  scrollToBottom() {
    this.messagesDiv.scrollTo({
      top: this.messagesDiv.scrollHeight,
      behavior: "smooth"
    })
  }

  // Replaces all displayed messages with the currently loaded messages
  async showAllMessages() {
    let messages = Object.values(this.messages)
    messages.sort((a, b) => a.saved - b.saved)
    const htmlMessages = await asyncMap(messages, htmlForMessage)
    this.messagesDiv.replaceChildren(...htmlMessages)
  }

  async showOlderMessages() {
    if (this.oldestMessageTimestamp) {
      this.showMessages(await cloud.fetchOlderMessages(this.oldestMessageTimestamp), true)
    } else {
      // TODO: Update UI to convey we have run out of older messages
    }
  }

  // MARK: Action Handlers

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
      if (dieInput.id === "die-0") {
        dieInput.querySelector("input").value = ""
        dieInput.querySelector("c").innerText = noDiePlaceholder
      } else {
        dieInput.remove()
      }
    }

    await cloud.postMessageComponents(text, dice)
    this.scrollToBottom()
  }

  pageClicked(e) {
    console.debug("e.target =", e.target)
    if (!this.visible) {
      return
    }

    let value = null
    if (e.target.nodeName === "C") {
      value = e.target.innerText
      console.debug("Overriding value =", value)
    }
    const trait = e.target.closest(".trait")
    if (trait) {
      const label = trait.querySelector(".trait-name").innerText
      value = value ?? trait.querySelector(".trait-value c").innerText

      let dieInput = this.diceTable.lastElementChild
      for (const input of this.diceTable.querySelectorAll("input")) {
        if (input.value === label) {
          // The trait is aready included, so overwrite the old die value.
          dieInput = input.closest(".die-input")
        }
      }
      dieInput.querySelector("input").value = label
      dieInput.querySelector("c").innerText = this.sanitizeDieSize(value)

      if (this.diceTable.lastElementChild.querySelector("c").innerText !== noDiePlaceholder) {
        // If we actually filled the last row, instead of updating a previous row, then add a new one.
        this.addNewDieInputRow()
      }
    }

    // Don't go into editing mode for the clicked node.
    e.preventDefault()
    e.stopPropagation()
    // contenteditable seems to be ignoring the above, so explicitly blur to sort-of achieve the effect.
    console.debug("document.activeElement =", document.activeElement)
    document.activeElement.blur()
  }

  // MARK: Edit Handlers

  installDieSizeEditHandlers(node) {
    const c = node.querySelector("c")
    c.addEventListener("focus", (e) => {
      this.dieSizeFocus(e)
    })
    c.addEventListener("blur", (e) => {
      this.dieSizeBlur(e)
    })
  }

  dieSizeFocus(e) {
    const c = e.target
    let convertedText = html_to_text(c.innerHTML)
    if (convertedText === noDiePlaceholder) {
      convertedText = ""
    }
    c.innerText = convertedText

    const range = document.createRange()
    range.selectNodeContents(c)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  dieSizeBlur(e) {
    const c = e.target
    c.innerHTML = this.sanitizeDieSize(c.innerText)

    let allDieInputsFull = true
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.querySelector("c").innerText === noDiePlaceholder) {
        allDieInputsFull = false
      }
    }
    if (allDieInputsFull) {
      this.addNewDieInputRow()

      // If the user tabs out of the the last size field, it'll select the Post button 
      // before the new row is inserted into the DOM, so forcibly select the new label input.
      newRow.querySelector("input").focus()
    }
  }

  sanitizeDieSize(cText) {
    let die = c_to_html(cText)[0]
    switch (die) {
      case "4":
      case "6":
      case "8":
      case "0":
      case "2":
        return die
      default:
        return noDiePlaceholder
    }
  }

  addNewDieInputRow() {
    const newRow = this.diceRowTemplate.cloneNode(true)
    newRow.id = `die-${this.diceTable.childElementCount}`
    this.diceTable.appendChild(newRow)
    this.installDieSizeEditHandlers(newRow)
  }

  // MARK: Listeners

  showMessage(message) {
    this.showMessages([message])
  }

  async showMessages(messages, areOld = false) {
    const newMessages = await asyncFilter(messages, async (message) => {
      let messageIsNew = true
      if (this.messages[message.id]) {
        // This is an update to a previously-displayed message
        messageIsNew = false
        const oldHtml = document.getElementById(htmlIdForMessage(message))
        oldHtml.replaceWith(await htmlForMessage(message))
      }
      // Always store the new message
      this.messages[message.id] = message
      return messageIsNew
    })

    const html = await asyncMap(newMessages, htmlForMessage)
    if (areOld) {
      this.messagesDiv.prepend(...html)
      this.oldestMessageTimestamp = messages[0]?.saved
    } else {
      this.messagesDiv.append(...html)
      this.scrollToBottom()
    }
  }

}

// MARK: Rendering

function htmlIdForMessage(message) {
  return `message-${message.id}`
}

async function htmlForMessage(message) {
  const html = document.createElement("li")
  html.id = htmlIdForMessage(message)
  html.classList.add("message")
  html.innerHTML =
    `<span>${formatAbsoluteTime(message.saved)} ${await cloud.displayNameForUserId(message.author)}:</span>` +
    `<div>${message.text}</div>`

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

// MARK: Click-to-Roll

document.getElementById("pages").addEventListener("click", (e) => {
  messages.pageClicked(e)
})

export const messages = new Messages()