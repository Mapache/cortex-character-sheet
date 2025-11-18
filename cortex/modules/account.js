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
    this.displayNameDiv = document.getElementById("display-name")
    this.displayEmojiDiv = document.getElementById("display-emoji")
    this.displayEmojiFrameDiv = document.getElementById("display-emoji-frame")

    cloud.subscribeToUserProfile(async (userProfile) => {
      this.userProfileUpdated()
    })

    this.installEditHandlers()
  }

  async sanitizeUserProfile(needsSaving = false) {
    const userProfile = cloud.userProfile
    if (!userProfile) {
      console.error("Attempting to sanitize nonexistent user profile!")
      return
    }
    if (!userProfile.displayName || userProfile.displayName === "") {
      const user = await cloud.requireSignIn()
      userProfile.displayName = user.displayName
      needsSaving = true
    }
    if (!userProfile.displayEmoji || userProfile.displayEmoji === "") {
      userProfile.displayEmoji = randomNatureEmoji()
      needsSaving = true
    }
    const firstCharacter = [...userProfile.displayEmoji][0]
    if (userProfile.displayEmoji !== firstCharacter) {
      userProfile.displayEmoji = firstCharacter
      needsSaving = true
    }
    for (const [campaignId, displayName] of Object.entries(userProfile.campaignDisplayNames)) {
      if (!displayName) {
        delete userProfile.campaignDisplayNames[campaignId]
        needsSaving = true
      }
    }
    if (needsSaving) {
      cloud.saveUserProfile()
    }
  }

  // MARK: Action Handlers

  pageClicked(e) {
  }

  // MARK: Edit Handlers

  installEditHandlers() {
    this.displayNameDiv.addEventListener("click", (e) => {
      if (cloud.userProfile) {
        this.displayNameDiv.contentEditable = true
        this.displayNameDiv.focus()
        selectAllTextOf(this.displayNameDiv)
      } else {
        cloud.signIn()
      }
    })
    this.displayNameDiv.addEventListener("focus", (e) => {
      // Nothing to do
    })
    this.displayNameDiv.addEventListener("blur", async (e) => {
      this.displayNameDiv.contentEditable = false
      const newDisplayName = this.displayNameDiv.innerText.trim()
      if (cloud.userProfile.displayName !== newDisplayName) {
        cloud.userProfile.displayName = newDisplayName
        this.userProfileUpdated(true)
      }
    })
    this.displayNameDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        e.target.blur()
      }
    })

    this.displayEmojiFrameDiv.addEventListener("click", (e) => {
      if (cloud.userProfile) {
        this.displayEmojiDiv.contentEditable = true
        this.displayEmojiDiv.focus()
        selectAllTextOf(this.displayEmojiDiv)
      } else {
        cloud.signIn()
      }
    })
    this.displayEmojiDiv.addEventListener("focus", (e) => {
      // Nothing to do
    })
    this.displayEmojiDiv.addEventListener("blur", async (e) => {
      this.displayEmojiDiv.contentEditable = false
      const newDisplayEmoji = this.displayEmojiDiv.innerText.trim()
      if (cloud.userProfile.displayEmoji !== newDisplayEmoji) {
        cloud.userProfile.displayEmoji = newDisplayEmoji
        this.userProfileUpdated(true)
      }
    })
    this.displayEmojiDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        e.target.blur()
      }
    })
  }

  // MARK: Listeners

  async userProfileUpdated(needsSaving = false) {
    if (cloud.userProfile) {
      this.sanitizeUserProfile(needsSaving)
      this.displayNameDiv.innerText = cloud.userProfile.displayName ?? "Click to set Display Name"
      this.displayEmojiDiv.innerText = cloud.userProfile.displayEmoji ?? "👤"
    } else {
      this.displayNameDiv.innerText = "Not Signed In"
      this.displayEmojiDiv.innerText = "👤"
    }
  }

}

const natureEmoji = "🐵🐒🦍🦧🐶🐕🐩🐺🦊🦝🐱🐈🦁🐯🐅🐆🐴🫎🫏🐎🦄🦓🦌🦬🐮🐂🐃🐄🐷🐖🐗🐏🐑🐐🐪🐫🦙🦒🐘🦣🦏🦛🐭🐁🐀🐹🐰🐇🐿️🦫🦔🦇🐻🐨🐼🦥🦦🦨🦘🦡🦃🐔🐓🐣🐤🐥🐦🐧🕊️🦅🦆🦢🦉🦤🪶🦩🦚🦜🪿🐸🐊🐢🦎🐍🐲🐉🦕🦖🐳🐋🐬🦭🐟🐠🐡🦈🐙🐚🪸🪼🦀🦞🦐🦑🐌🦋🐛🐜🐝🪲🐞🦗🪳🕷️🦂🦟🪰🪱🦠💐🌸💮🪷🏵️🌹🥀🌺🌻🌼🌷🪻🌱🪴🌲🌳🪾🌴🌵🌾🌿☘️🍀🍁🍂🍃🍄"
function randomNatureEmoji() {
  const natureEmojiArray = [...natureEmoji]
  return natureEmojiArray[natureEmojiArray.length * Math.random() | 0]
}

export const account = new Account()