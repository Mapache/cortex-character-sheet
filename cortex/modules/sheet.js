// Umbrella import that bootstraps top-level controllers and puts items into the window namespace for use from HTML attributes

import "./account.js"

import "./dragAndDrop.js"

import { add_page, add_trait_group, add_trait, remove_item } from "./elements.js"
window.add_page = add_page
window.add_trait_group = add_trait_group
window.add_trait = add_trait
window.remove_item = remove_item

import { hideCurrentModal } from "./modal.js"
window.hideCurrentModal = hideCurrentModal

import "./toolbar.js"

import * as traitGroupContextMenu from "./traitGroupContextMenu.js"
window.traitGroupContextMenu = traitGroupContextMenu

import { inferTraitGroupStyle } from "./traitGroupStyle.js"
window.inferTraitGroupStyle = inferTraitGroupStyle

import "./windowOnload.js"