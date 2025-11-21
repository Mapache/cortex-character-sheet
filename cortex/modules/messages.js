import { asyncFilter, asyncMap } from "./async.js"
import { Cloud, cloud, Message } from "./cloud.js"
import { dText_to_html, html_to_text, noDiePlaceholder } from "./conversion.js"
import { addClickToEditHandlersToTextNode, selectAllTextOf, setEditingEnabled } from "./eventHandlers.js"
import { formatAbsoluteTime, titleCase } from "./formatting.js"
import { ToggleableStyle } from "./toggleableStyle.js"
import { emptyDescriptionsHidden, layoutControlsHidden } from "./toggleableStyles.js"
import { toggleEmptyDescriptionsHidden, toggleLayoutControlsHidden } from "./toolbar.js"

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

export class Messages {
  static messagesByCampaignId = {}
  static messagesForCampaignId(campaignId) {
    if (!campaignId) {
      console.error("Attempting to get messages controller for nonexistent campaign!")
      return null
    }
    let messages = Messages.messagesByCampaignId[campaignId]
    if (!messages) {
      messages = new Messages(campaignId)
      Messages.messagesByCampaignId[campaignId] = messages
    }
    return messages
  }
  static messagesForCurrentCampaign() {
    return Messages.messagesForCampaignId(cloud.currentCampaign?.id)
  }

  constructor(campaignId) {
    this.campaignId = campaignId
    this.messages = null
    this.messagesContainerDiv = document.getElementById("messages-container")
    this.messagesDiv = document.getElementById("messages")
    this.fetchOlder = document.getElementById("fetch-older")
    this.messageText = document.getElementById("message-text")
    this.diceTable = document.getElementById("dice")
    this.initialDiceRow = document.getElementById("die-0")
    this.diceRowTemplate = this.initialDiceRow.cloneNode(true)
    this.postButton = document.getElementById("message-post")
    this.trashButton = document.getElementById("message-clear")
    this.handlersAreInstalled = false
    this.olderMessagesAvailable = true
  }

  // MARK: Visibility

  async show() {
    if (this.visible) {
      return
    }
    this.visible = true
    messagingVisible.enable()
    this.werelayoutControlsHidden = layoutControlsHidden.enabled
    layoutControlsHidden.enable()
    toggleLayoutControlsHidden.disable()
    emptyDescriptionsHidden.enable()
    toggleEmptyDescriptionsHidden.disable()
    setEditingEnabled(false)

    if (!this.messages) {
      this.active = true
      this.messages = {}
      this.showAllMessages() // Reset any messages shown from another Campaign
      const recentTimestamp = new Date(new Date().getTime() - 15 * 60 * 1000)
      this.oldestMessageTimestamp = recentTimestamp
      await cloud.subscribeToNewerMessages(this, recentTimestamp)
      await cloud.subscribeToOlderMessagesBatch(this, this.oldestMessageTimestamp)
      this.scrollToBottom()
    }

    if (!this.handlersAreInstalled) {
      this.handlersAreInstalled = true

      this.fetchOlder.onclick = async (e) => {
        this.showOlderMessages()
      }

      this.messageText.onblur = (e) => {
        this.updatePostButton()
      }
      this.postButton.onclick = (e) => {
        this.postMessage(e)
      }
      this.trashButton.onclick = (e) => {
        if (!this.trashButton.classList.contains("disabled")) {
          this.clearDiceInputs()
        }
      }
      this.updatePostButton()

      this.installDieSizeEditHandlers(this.initialDiceRow)
    }
  }

  hide() {
    if (!this.visible) {
      return
    }
    this.visible = false
    messagingVisible.disable()
    layoutControlsHidden.setEnabled(this.werelayoutControlsHidden)
    toggleLayoutControlsHidden.enable()
    toggleEmptyDescriptionsHidden.enable()
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
    // Use setTimeout() to give the DOM time to update first.
    setTimeout(() => {
      this.messagesContainerDiv.scrollTo({
        top: this.messagesContainerDiv.scrollHeight,
        behavior: "smooth"
      })
    }, 10)
  }

  // Replaces all displayed messages with the currently loaded messages
  async showAllMessages() {
    let messages = Object.values(this.messages)
    messages.sort((a, b) => a.saved - b.saved)
    const htmlMessages = await asyncMap(messages, htmlForMessage)
    this.messagesDiv.replaceChildren(...htmlMessages)
    this.scrollToBottom()
  }

  async showOlderMessages() {
    if (this.olderMessagesAvailable) {
      await cloud.subscribeToOlderMessagesBatch(this, this.oldestMessageTimestamp)
    } else {
      // UI should already be updated by showMessages() to convey we have run out of older messages,
      // but fix it if got overwritten.
      this.updateFetchOlderMessagesButton()
    }
  }

  updateFetchOlderMessagesButton() {
    // When we ran out of old messages to fetch, hide the button.
    this.fetchOlder.style.display = (this.olderMessagesAvailable) ? "" : "none"
  }

  async inactivate() {
    this.wasVisible = this.visible
    this.hide()
    this.active = false
  }

  async activate() {
    this.updateFetchOlderMessagesButton()
    this.showAllMessages()
    this.active = true
    this.handlersAreInstalled = false
    if (this.wasVisible) {
      this.show()
    }
  }

  // MARK: Action Handlers

  async postMessage(e) {
    if (!this.active) {
      return
    }
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
    this.clearDiceInputs()

    await cloud.postMessageComponents(text, dice)
    this.scrollToBottom()
  }

  clearDiceInputs() {
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.id === "die-0") {
        dieInput.querySelector("input").value = ""
        dieInput.querySelector("d").innerText = noDiePlaceholder
      } else {
        dieInput.remove()
      }
    }
    this.updatePostButton()
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
      if (!e.altKey) {
        // Alt-click allows duplicating rows.
        for (const input of this.diceTable.querySelectorAll("input")) {
          if (input.value === label) {
            // The trait is aready included, so overwrite the old die value.
            dieInput = input.closest(".die-input")
          }
        }
      }
      // Shift-click deletes existing matching rows.
      dieInput.querySelector("input").value = (e.shiftKey) ? "" : label
      dieInput.querySelector("d").innerText = (e.shiftKey) ? noDiePlaceholder : this.sanitizeDieSize(value)

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
    d.onfocus = (e) => {
      this.dieSizeFocus(e)
    }
    d.onblur = (e) => {
      this.dieSizeBlur(e)
    }
    d.onkeyup = (e) => {
      switch (e.key) {
        case "2":
        case "4":
        case "6":
        case "8":
        case "0":
          // Instantly convert dice
          d.innerText = e.key
          selectAllTextOf(d)
      }
    }
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
    this.trashButton.classList.add("disabled")

    // If there's any dice, enable and set label to Roll.
    for (const dieInput of document.querySelectorAll(".die-input")) {
      if (dieInput.querySelector("d").innerText !== noDiePlaceholder) {
        this.postButton.textContent = "Roll"
        this.postButton.disabled = false
        this.trashButton.classList.remove("disabled")
        return
      }
    }

    // If there's any message, enable.
    if (this.messageText.value.length > 0) {
      this.postButton.disabled = false
    }
  }

  // MARK: Listeners

  async showMessage(message, isOld = false) {
    this.showMessages([message], isOld)
  }

  async showMessages(messages, areOld = false) {
    if (messages.length === 0 && areOld) {
      this.olderMessagesAvailable = false
      this.updateFetchOlderMessagesButton()
      return
    }
    let newMessages = await asyncFilter(messages, async (message) => {
      let messageNeedsDisplaying = true
      if (this.messages[message.id]) {
        // This is an update to a previously-displayed message
        messageNeedsDisplaying = false
        if (this.active) {
          const oldHtml = document.getElementById(htmlIdForMessage(message))
          oldHtml.replaceWith(await htmlForMessage(message))
        }
      }
      // Always store the new message
      this.messages[message.id] = message
      return messageNeedsDisplaying
    })

    if (this.active && newMessages.length > 0) {
      // Ensure the messsages are in ascending order.
      newMessages.sort((a, b) => a.saved - b.saved)
      const htmlForMessages = await asyncMap(newMessages, htmlForMessage)
      if (areOld) {
        const lastNewMessageSaved = newMessages.at(-1).saved
        const saved = (div) => this.messages[messageIdForHtmlId(div.id)].saved
        let didInsert = false
        for (const oldMessageDiv of this.messagesDiv.children) {
          if (saved(oldMessageDiv) > lastNewMessageSaved) {
            oldMessageDiv.before(...htmlForMessages)
            didInsert = true
            break
          }
        }
        if (!didInsert) {
          this.messagesDiv.append(...htmlForMessages)
          this.scrollToBottom()
        }

        if (0) {
          // Verify all messages are in order.
          const messageTimestamps = Array.from(this.messagesDiv.children).map(saved)
          const sortedMessageTimestamps = messageTimestamps.toSorted((a, b) => a.saved - b.saved)
          for (let i = 0; i < messageTimestamps.length; ++i) {
            if (messageTimestamps[i] !== sortedMessageTimestamps[i]) {
              console.error("Out-of-order message at", messageTimestamps[i])
            }
          }
        }

        const messageTimeStamp = newMessages[0]?.saved
        if (messageTimeStamp < this.oldestMessageTimestamp) {
          this.oldestMessageTimestamp = messageTimeStamp
        }
        this.updateFetchOlderMessagesButton()
      } else {
        this.messagesDiv.append(...htmlForMessages)
        this.scrollToBottom()
      }
    }
  }

}

// MARK: Rendering

function htmlIdForMessage(message) {
  return `message-${message.id}`
}

function messageIdForHtmlId(id) {
  return id.split("-")[1]
}

async function htmlForMessage(message) {
  const html = document.createElement("li")
  html.id = htmlIdForMessage(message)
  html.classList.add("message")
  html.innerHTML =
    `<div class="message-header">
      <span class="message-icon">${await cloud.displayEmojiForUserId(message.author)}</span>
      <div class="message-header-info">
        <span class="message-time"><ref>${formatAbsoluteTime(message.saved)}</ref></span>
        <div class="message-names">
          <span class="message-author">${await cloud.displayNameForUserId(message.author)}</span>&nbsp;
          <span class="message-character">as <span class="message-character-name">${titleCase(message.characterName) ?? "Unknown"}</span></span>:&nbsp;
        </div>
      </div>
    </div>` +
    `<div class="message-text">${message.text}</div>`
  if (cloud.user.uid === message.author) {
    html.querySelector(".message-author").classList.add("self-author")
    addClickToEditHandlersToTextNode(
      html.querySelector(".message-text"),
      null,
      true,
      (text) => cloud.updateMessageText(message.id, text)
    )
  }
  if (cloud.user.uid === message.author /*|| cloud.accessFor(this.campaignId) === CampaignPermissions.admin*/) {
    addClickToEditHandlersToTextNode(
      html.querySelector(".message-character-name"),
      html.querySelector(".message-character"),
      true,
      (text) => cloud.updateMessageCharacterName(message.id, text)
    )
  }

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
        startStatusPushTimer()
      }

      row.querySelector(".die-size").onclick = (e) => {
        toggleStatus(Message.DieRoll.effect)
      }
      row.querySelector(".die-result").onclick = (e) => {
        toggleStatus(Message.DieRoll.total)
      }

      // For batching up a series of dice clicks to reduce writes at the server end.
      let pushTimerId = null
      function startStatusPushTimer() {
        if (pushTimerId) {
          clearTimeout(pushTimerId)
        }
        pushTimerId = setTimeout(() => {
          cloud.updateMessageDiceStatus(message.id, message.diceStatus)
          pushTimerId = null
        }, 5000)
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
        animateFlash(row, () => {
          table.replaceWith(htmlForOutcomes(message, updateStatusClasses))
          // Wait until after animation to avoid local change detection overwriting us mid-flash.
          cloud.updateMessageDiceStatus(message.id, diceStatus)
        })
      }
    }
  }
  return table
}

// MARK: Click-to-Roll

document.getElementById("pages").addEventListener("click", (e) => {
  Messages.messagesForCurrentCampaign().pageClicked(e)
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