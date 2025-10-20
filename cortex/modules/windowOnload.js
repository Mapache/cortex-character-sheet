
import { cloud } from "./cloud.js"
import { install_title_listeners } from "./elements.js"
import { init_event_handlers } from "./eventHandlers.js"
import { auth } from "./firebase.js"
import { load_character, load_character_path } from "./load.js"
import { upload_character, download_character } from "./toolbar.js"
import { whenInteractive, urlHashParams } from "./util.js"

whenInteractive(() => {
  document.addEventListener("keydown", async (e) => {
    if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
      e.preventDefault()
      if (auth.currentUser) {
        upload_character(e)
      } else {
        download_character(e)
      }
    }
  }, false)

  init_event_handlers(document)
  install_title_listeners()
  loadTemplate()
  loadView()
})

// Load the static sheet at the relative path specified by "template"
async function loadTemplate() {
  const templateParam = "template"
  if (urlHashParams.has(templateParam)) {
    const template = urlHashParams.get(templateParam)
    load_character_path("characters/" + template)
  }
}

// Load the campaign or campaign.sheet specified by "view"
async function loadView() {
  const viewParam = "view"
  if (urlHashParams.has(viewParam)) {
    const view = urlHashParams.get(viewParam)
    const [campaignId, characterSheetId] = view.split(".")
    await cloud.switchCampaignId(campaignId)
    if (characterSheetId) {
      const characterSheet = await cloud.currentCharacterSheetWithId(characterSheetId)
      if (characterSheet) {
        load_character(characterSheet.json)
        // Restore the character hash wiped out by switching to the campaign
        cloud.updateURLForCharacter(characterSheet)
      }
    }
  }
}