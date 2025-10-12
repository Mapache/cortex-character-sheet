
import { cloud } from "./cloud.js"
import { install_title_listeners } from "./elements.js"
import { init_event_handlers } from "./eventHandlers.js"
import { auth } from "./firebase.js"
import { load_character, load_character_path } from "./load.js"
import { upload_character, download_character } from "./toolbar.js"
import { whenInteractive } from "./util.js"

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
  load_default_sheet()
})

async function load_default_sheet() {
  const urlHash = window.location.hash
  // Slice off the "#", as URLSearchParams is designed for query strings with an "?"
  const urlParams = new URLSearchParams(urlHash.slice(1))

  // Load the static sheet at the relative path specified by "template"
  const templateParam = "template"
  if (urlParams.has(templateParam)) {
    const templateParam = urlParams.get(templateParam)
    load_character_path("characters/" + templateParam)
  }

  // Load the campaign or campaign.sheet specified by "view"
  const viewParam = "view"
  if (urlParams.has(viewParam)) {
    const view = urlParams.get(viewParam)
    const [campaignId, characterSheetId] = view.split(".")
    await cloud.switchCampaignId(campaignId)
    if (characterSheetId) {
      const characterSheet = await cloud.currentCharacterSheetWithId(characterSheetId)
      if (characterSheet) {
        load_character(characterSheet.json)
        // Restore the character hash wiped out by switching to the campaign
        window.location.hash = urlHash
      }
    }
  }
}