
import { install_title_listeners } from "./elements.js"
import { init_event_handlers } from "./eventHandlers.js"
import { load_character_path } from "./load.js"
import { download_character } from "./toolbar.js"
import { whenInteractive } from "./util.js"

whenInteractive(function () {
  document.addEventListener("keydown", function (e) {
    if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
      e.preventDefault()
      download_character(e)
    }
  }, false)

  init_event_handlers(document)
  install_title_listeners()
  load_default_sheet()
})

// Load the static sheet specified by the relative path in the URL Parameter "sheet"
async function load_default_sheet() {
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  const sheetParam = "sheet"
  if (urlParams.has(sheetParam)) {
    const sheetPath = urlParams.get(sheetParam)
    load_character_path("characters/" + sheetPath)
  }
}