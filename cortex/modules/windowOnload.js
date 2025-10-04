import { init_event_handlers } from "./eventHandlers.js"
import { download_character } from "./save.js"

window.onload = function () {
  document.addEventListener("keydown", function (e) {
    if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
      e.preventDefault()
      download_character(e)
    }
  }, false);

  init_event_handlers(document)
}