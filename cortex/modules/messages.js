import { asyncMap, asyncFilter } from "./async.js"
import { CampaignPermissions, Message, cloud } from "./cloud.js"
import { noDiePlaceholder, dText_to_html, html_to_text } from "./conversion.js"
import { setEditingEnabled, selectAllTextOf } from "./eventHandlers.js"
import { Flags } from "./flags.js"
import { titleCase, formatAbsoluteTime } from "./formatting.js"
import { menu, menuEntry, menuDivider, menuLabel, menuTextInput } from "./menu.js"
import { ToggleableStyle } from "./toggleableStyle.js"
import { layoutControlsHidden, emptyDescriptionsHidden } from "./toggleableStyles.js"

const messagingVisible = new ToggleableStyle(
  "#messaging",
  "messaging-visible",
  "messaging-hidden",
  `
    #pages {
      margin-left: calc(var(--messaging-width) + 20px);
    }
	`,
  `	`,
  false)

class Messages {
  constructor() {
    this.messages = null
    this.messagesDiv = document.getElementById("messages")
    this.messageText = document.getElementById("message-text")
    this.diceTable = document.getElementById("dice")
    this.postButton = document.getElementById("message-post")
  }

  // MARK: Visibility

  async show() {
    this.visible = true
    messagingVisible.enable()
    this.werelayoutControlsHidden = layoutControlsHidden.enabled
    layoutControlsHidden.enable()
    emptyDescriptionsHidden.enable()
    setEditingEnabled(false)

    if (!this.messages) {
      this.messages = {}
      const messages = await cloud.fetchOlderMessages()
      this.showMessages(messages, true)
      await cloud.subscribeToNewerMessages(this, messages.at(-1)?.saved)
      this.scrollToBottom()

      this.messageText.onblur = (e) => {
        this.updatePostButton()
      }
      this.postButton.onclick = (e) => {
        this.postMessage(e)
      }
      this.updatePostButton()

      const initialDiceRow = document.getElementById("die-0")
      this.diceRowTemplate = initialDiceRow.cloneNode(true)
      this.installDieSizeEditHandlers(initialDiceRow)
    }
  }

  hide() {
    this.visible = false
    messagingVisible.disable()
    layoutControlsHidden.setEnabled(this.werelayoutControlsHidden)
    setEditingEnabled(true)
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
    const text = this.messageText.value

    let dice = []
    for (const dieInput of document.querySelectorAll(".die-input")) {
      const label = dieInput.querySelector("input").value
      let size = null
      switch (dieInput.querySelector("d").innerText) {
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
    if (text.length === 0 && dice.length === 0) {
      return
    }

    this.messageText.value = ""
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.id === "die-0") {
        dieInput.querySelector("input").value = ""
        dieInput.querySelector("d").innerText = noDiePlaceholder
      } else {
        dieInput.remove()
      }
    }
    this.updatePostButton()

    await cloud.postMessageComponents(text, dice)
    this.scrollToBottom()
  }

  pageClicked(e) {
    if (!this.visible) {
      return
    }
    if (e.target.closest(".track")) {
      // Don't roll track values when the track is clicked, only when the text is clicked.
      return
    }

    const trait = e.target.closest(".trait")
    if (trait) {
      const label = trait.querySelector(".trait-name").innerText.replace(/(\r\n|\n|\r)/gm, " ")
      const d = (e.target.nodeName === "D") ? e.target : trait.querySelector(".trait-value d")
      const value = d?.innerText ?? noDiePlaceholder

      let dieInput = this.diceTable.lastElementChild
      for (const input of this.diceTable.querySelectorAll("input")) {
        if (input.value === label) {
          // The trait is aready included, so overwrite the old die value.
          dieInput = input.closest(".die-input")
        }
      }
      dieInput.querySelector("input").value = label
      dieInput.querySelector("d").innerText = this.sanitizeDieSize(value)

      if (this.diceTable.lastElementChild.querySelector("d").innerText !== noDiePlaceholder) {
        // If we actually filled the last row, instead of updating a previous row, then add a new one.
        this.addNewDieInputRow()
      }

      const animationTarget = e.target.closest(".trait-description")
        // User clicked in the description, so animate the whole trait.
        ? trait
        // Only animate the header row.
        : trait.querySelector(".trait-header")
      // Animate a flash around both the clicked target and the modified die input row.
      for (const target of [animationTarget, dieInput]) {
        animateFlash(target)
      }

      this.updatePostButton()
    }
  }

  // MARK: Edit Handlers

  installDieSizeEditHandlers(node) {
    const d = node.querySelector("d")
    d.addEventListener("focus", (e) => {
      this.dieSizeFocus(e)
    })
    d.addEventListener("blur", (e) => {
      this.dieSizeBlur(e)
    })
  }

  dieSizeFocus(e) {
    const d = e.target
    let convertedText = html_to_text(d.innerHTML)
    if (convertedText === noDiePlaceholder) {
      convertedText = ""
    }
    d.innerText = convertedText

    selectAllTextOf(d)
  }

  dieSizeBlur(e) {
    const d = e.target
    d.innerHTML = this.sanitizeDieSize(d.innerText)

    let allDieInputsFull = true
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.querySelector("d").innerText === noDiePlaceholder) {
        allDieInputsFull = false
      }
    }
    if (allDieInputsFull) {
      // If the user tabs out of the the last size field, it'll select the Post button 
      // before the new row is inserted into the DOM, so forcibly select the new label input.
      this.addNewDieInputRow().querySelector("input").focus()
    }

    this.updatePostButton()
  }

  sanitizeDieSize(dText) {
    let die = dText_to_html(dText)[0]
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
    return newRow
  }

  updatePostButton() {
    this.postButton.textContent = "Post"
    this.postButton.disabled = true

    // If there's any dice, enable and set label to Roll.
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.querySelector("d").innerText !== noDiePlaceholder) {
        this.postButton.textContent = "Roll"
        this.postButton.disabled = false
        return
      }
    }

    // If there's any message, enable.
    if (this.messageText.value.length > 0) {
      this.postButton.disabled = false
    }
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
    `<span>${formatAbsoluteTime(message.saved)}
      ${await cloud.displayNameForUserId(message.author)} as
      ${titleCase(message.characterName)}:</span>` +
    `<div>${message.text}</div>`

  if (message.dice.length > 0) {
    const table = document.createElement("table")
    table.classList.add("roll")
    const updateStatusClasses = []
    for (const [index, die] of message.dice.entries()) {
      const row = document.createElement("tr")
      if (die.result === 1) {
        row.classList.add("hitch")
      }

      function updateStatusClass() {
        switch (message.diceStatus[index]) {
          case Message.DieRoll.total:
            row.classList.add("total")
            row.classList.remove("effect")
            break
          case Message.DieRoll.effect:
            row.classList.add("effect")
            row.classList.remove("total")
            break
          default:
            row.classList.remove("total")
            row.classList.remove("effect")
        }
      }
      updateStatusClasses.push(updateStatusClass)

      row.innerHTML =
        `<td class="trait"><h2 class="trait-name">${die.label}</h2></td>` +
        `<td class="die-size"><d>${die.size % 10}</d></td>` +
        `<td class="die-arrow">→</td>` +
        `<td class="die-result"><span class="die-frame d${die.size}"><span class="die-value">${die.result ?? "?"}</span></span></td>`
      table.appendChild(row)
      updateStatusClass()

      function toggleStatus(status) {
        if (die.result === 1) {
          return
        }
        if (message.diceStatus[index] === status) {
          message.diceStatus[index] = Message.DieRoll.unchosen
        } else {
          message.diceStatus[index] = status
        }
        updateStatusClass()
        html.querySelector(".dice-outcome").replaceWith(htmlForOutcomes(message, updateStatusClasses))
        // TODO: Push status to server after a delay.
      }

      row.querySelector(".die-size").onclick = (e) => {
        toggleStatus(Message.DieRoll.effect)
      }
      row.querySelector(".die-result").onclick = (e) => {
        toggleStatus(Message.DieRoll.total)
      }
    }
    html.appendChild(table)
    html.appendChild(htmlForOutcomes(message, updateStatusClasses))

    // console.debug(message.dice.map((roll) => `${roll.result}/${roll.size}`))
    // console.debug(message.diceStatusSuggestions())
  }

  return html
}

function htmlForOutcomes(message, updateStatusClasses) {
  const areAnyDiceSelected = (
    message.diceStatus?.includes(Message.DieRoll.total) ||
    message.diceStatus?.includes(Message.DieRoll.effect)
  )
  const outcomes = areAnyDiceSelected ? [message.diceStatus] : message.diceStatusSuggestions()
  const areSuggestions = !areAnyDiceSelected

  const table = document.createElement("table")
  table.classList.add("dice-outcome")
  if (areSuggestions) {
    table.classList.add("suggestion")
  }
  for (const [index, diceStatus] of outcomes.entries()) {
    const [totalDice, effectDice] = message.diceForStatus(diceStatus)
    const total = totalDice.reduce((sum, die) => sum + die.result, 0)
    const row = document.createElement("tr")
    if (areSuggestions) {
      row.classList.add("shimmer")
      row.style.animationDelay = `${index % 4}s`
    }
    row.innerHTML =
      `<td class="dice-total-contributions"><h2>${totalDice.map((die) => die.result).join("+")} =</h2></td>` +
      `<td class="dice-total-sum"><h2>${total}</h2></td>` +
      `<td class="dice-effect">${effectDice.map((die) => `<d>${die.size % 10}</d>`).join("")}</td>`
    table.appendChild(row)
    if (areSuggestions) {
      row.onclick = (e) => {
        message.diceStatus = diceStatus
        for (const updateStatusClass of updateStatusClasses) {
          updateStatusClass()
        }
        row.classList.remove("shimmer")
        row.style.animationDelay = `0s`
        animateFlash(row, () => table.replaceWith(htmlForOutcomes(message, updateStatusClasses)))
        cloud.updateMessageDiceStatus(message.id, diceStatus)
      }
    }
  }
  return table
}

// MARK: Click-to-Roll

document.getElementById("pages").addEventListener("click", (e) => {
  messages.pageClicked(e)
})

function animateFlash(node, then) {
  node.classList.add("flash")
  node.addEventListener("animationend",
    () => {
      node.classList.remove("flash")
      if (then) {
        then()
      }
    },
    { once: true })
}

export const messages = new Messages()