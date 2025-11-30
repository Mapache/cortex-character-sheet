
import { cloud } from "./cloud.js"
import { whenInteractive } from "./defer.js"
import { installTitleListeners } from "./elements.js"
import { addEditHandlers } from "./eventHandlers.js"
import { displayCharacterJson, displayCharacterJsonFromPath } from "./load.js"
import { downloadCharacter, uploadCharacter } from "./toolbar.js"
import { HashHandler } from "./urlHashHandler.js"

whenInteractive(() => {
  installSaveHandler()
  addEditHandlers(document)
  installTitleListeners(document)
})

function installSaveHandler() {
  document.addEventListener("keydown", async (e) => {
    if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode === 83) {
      e.preventDefault()
      if (uploadCharacter.enabled) {
        uploadCharacter.action()
      } else {
        downloadCharacter.action()
      }
    }
  }, false)
}

// Load the static sheet at the relative path specified by "template"
new HashHandler("template", (template) => {
  displayCharacterJsonFromPath("characters/" + template)
}).addListener()

// Load the campaign or campaign.sheet specified by "view"
async function parseView(view) {
  const [campaignId, characterSheetId] = view.split(".")
  await cloud.switchCampaignId(campaignId)
  if (characterSheetId) {
    const characterSheet = await cloud.currentCharacterSheetWithId(characterSheetId)
    if (characterSheet) {
      displayCharacterJson(characterSheet.json)
      // Restore the character hash wiped out by switching to the campaign
      cloud.updateURLForCharacter(characterSheet)
    }
  }
}

new HashHandler("view", parseView).addListener()