import { CampaignPermissions, cloud } from "./cloud.js"
import { whenInteractive } from "./defer.js"
import { characterEvents, isCurrentCharacterNameValid } from "./displayedCharacter.js"
import { Flags } from "./flags.js"
import { jsonForDisplayedCharacter } from "./save.js"
import { RestartableTimeout } from "./timer.js"

const autosaveIdleInterval = 30
const autosaveTimeout = new RestartableTimeout(autosave, autosaveIdleInterval * 1000)

async function autosave(overrideCampaign = null) {
  const campaign = overrideCampaign ?? cloud.currentCampaign
  if (cloud.accessFor(campaign?.id) >= CampaignPermissions.editor) {
    const json = jsonForDisplayedCharacter()
    await cloud.uploadCharacter(json, campaign)
  }
}

export function didModifyDisplayedCharacterSheet() {
  if (isCurrentCharacterNameValid()) {
    // Don't autosave until the character sheet has a name other than the default.
    autosaveTimeout.restart()
  }
}

whenInteractive(() => {
  if (!Flags.enableAutoSave) {
    return
  }
  let pages = document.querySelector("#pages")
  let focusContent = null
  pages.addEventListener("focusin", (e) => {
    focusContent = e.target.innerHTML
  })
  pages.addEventListener("focusout", (e) => {
    const contentWasChanged = focusContent !== e.target.innerHTML
    focusContent = null
    if (contentWasChanged) {
      didModifyDisplayedCharacterSheet()
    }
  })

  characterEvents.addEventListener("didModifyDisplayedCharacterSheet", async (e) => {
    didModifyDisplayedCharacterSheet()
  })
  characterEvents.addEventListener("willSwitchDisplayedCharacterSheet", async (e) => {
    await autosaveTimeout.finish()
  })

  cloud.events.addEventListener("willSwitchCampaign", async (e) => {
    if (!e.detail.nameOnly) {
      await autosaveTimeout.finish(e.detail.campaign)
    }
  })
})