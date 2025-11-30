import { cloud } from "./cloud.js"
import { whenInteractive } from "./defer.js"
import { isCurrentCharacterNameValid } from "./elements.js"
import { Flags } from "./flags.js"
import { jsonForDisplayedCharacter } from "./save.js"
import { RestartableTimeout } from "./timer.js"
import { uploadCharacter } from "./toolbar.js"

const autosaveIdleInterval = 30
const autosaveTimeout = new RestartableTimeout(autosave, autosaveIdleInterval * 1000)

async function autosave(campaign = null) {
  if (uploadCharacter.enabled) {
    let json = jsonForDisplayedCharacter()
    await cloud.uploadCharacter(json, campaign)
  }
}

export function didModifyDisplayedCharacter() {
  autosaveTimeout.restart()
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
    if (contentWasChanged && isCurrentCharacterNameValid()) {
      didModifyDisplayedCharacter()
    }
  })

  cloud.events.addEventListener("willSwitchCampaign", async (e) => {
    if (!e.detail.nameOnly) {
      await autosaveTimeout.finish(e.detail.campaign)
    }
  })
})