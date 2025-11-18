import { asyncMap, asyncFilter } from "./async.js"
import { UserProfile, cloud } from "./cloud.js"
import { noDiePlaceholder, dText_to_html, html_to_text } from "./conversion.js"
import { setEditingEnabled, selectAllTextOf } from "./eventHandlers.js"
import { Flags } from "./flags.js"
import { titleCase, formatAbsoluteTime } from "./formatting.js"
import { menu, menuEntry, menuDivider, menuLabel, menuTextInput } from "./menu.js"
import { ToggleableStyle } from "./toggleableStyle.js"
import { layoutControlsHidden, emptyDescriptionsHidden } from "./toggleableStyles.js"

const editingAccount = new ToggleableStyle(
  "#account",
  "account-editing",
  "account-static",
  ``,
  ``,
  false)

class Account {
  constructor() {
    this.accountDiv = document.getElementById("account")
    this.displayNameDiv = document.getElementById("displayName")
    this.displayEmojiDiv = document.getElementById("displayEmoji")

    cloud.subscribeToUserProfile((userProfile) => {
      this.userProfileUpdated(userProfile)
    })
  }

  // MARK: Action Handlers

  pageClicked(e) {
  }

  // MARK: Edit Handlers

  installEditHandlers() {
    this.displayNameDiv.addEventListener("focus", (e) => {
      //!
    })
    this.displayNameDiv.addEventListener("blur", async (e) => {
      cloud.userProfile.displayName = this.displayNameDiv.innerText
      cloud.saveUserProfile()
    })
    this.displayNameDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        e.target.blur()
      }
    })

    this.displayEmojiDiv.addEventListener("focus", (e) => {
      //!
    })
    this.displayEmojiDiv.addEventListener("blur", async (e) => {
      cloud.userProfile.displayEmoji = this.displayNameDiv.innerText
      cloud.saveUserProfile()
    })
    this.displayEmojiDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        e.target.blur()
      }
    })
  }

  // MARK: Listeners

  userProfileUpdated(userProfile) {
    if (userProfile) {
      if (!userProfile.displayEmoji) {
        userProfile.displayEmoji = randomNatureEmoji()
        cloud.saveUserProfile()
      }
      this.displayNameDiv.innerText = userProfile.displayName ?? "Click to set Display Name"
      this.displayEmojiDiv.innerText = userProfile.displayEmoji ?? "👤"
    } else {
      this.displayNameDiv.innerText = userProfile.displayName ?? "Not Signed In"
      this.displayEmojiDiv.innerText = userProfile.displayEmoji ?? "👤"
    }
  }

}

const natureEmoji = "🐵🐒🦍🦧🐶🐕🐩🐺🦊🦝🐱🐈🦁🐯🐅🐆🐴🫎🫏🐎🦄🦓🦌🦬🐮🐂🐃🐄🐷🐖🐗🐏🐑🐐🐪🐫🦙🦒🐘🦣🦏🦛🐭🐁🐀🐹🐰🐇🐿️🦫🦔🦇🐻🐨🐼🦥🦦🦨🦘🦡🦃🐔🐓🐣🐤🐥🐦🐧🕊️🦅🦆🦢🦉🦤🪶🦩🦚🦜🪿🐸🐊🐢🦎🐍🐲🐉🦕🦖🐳🐋🐬🦭🐟🐠🐡🦈🐙🐚🪸🪼🦀🦞🦐🦑🐌🦋🐛🐜🐝🪲🐞🦗🪳🕷️🦂🦟🪰🪱🦠💐🌸💮🪷🏵️🌹🥀🌺🌻🌼🌷🪻🌱🪴🌲🌳🪾🌴🌵🌾🌿☘️🍀🍁🍂🍃🍄"
function randomNatureEmoji() {
  const natureEmojiArray = [...natureEmoji]
  return natureEmojiArray[natureEmojiArray.length * Math.random() | 0]
}

export const account = new Account()