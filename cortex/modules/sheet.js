// Umbrella import that bootstraps top-level controllers and puts items into the window namespace for use from HTML attributes

import "./account.js"

import "./dragAndDrop.js"

import { addPage, addTraitGroup, addTrait, removeItem } from "./elements.js"
window.addPage = addPage
window.addTraitGroup = addTraitGroup
window.addTrait = addTrait
window.removeItem = removeItem

import { hideCurrentModal } from "./modal.js"
window.hideCurrentModal = hideCurrentModal

import "./toolbar.js"

import * as traitGroupContextMenu from "./traitGroupContextMenu.js"
window.traitGroupContextMenu = traitGroupContextMenu

import { inferTraitGroupStyle } from "./traitGroupStyle.js"
window.inferTraitGroupStyle = inferTraitGroupStyle

import "./windowOnload.js"