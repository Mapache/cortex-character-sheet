// Umbrella import that puts items into the window namespace for use from HTML attributes

import "./dragAndDrop.js"

import { add_page, add_trait_group, add_trait, remove_item } from "./elements.js"
window.add_page = add_page
window.add_trait_group = add_trait_group
window.add_trait = add_trait
window.remove_item = remove_item

import { close_modal } from "./modal.js"
window.close_modal = close_modal

import { campaigns_menu, characters_menu, upload_character, download_character, set_global_highlight_color, layoutControlsHidden, emptyDescriptionsHidden, helpModal, toggleMessaging, developmentHook } from "./toolbar.js"
window.campaigns_menu = campaigns_menu
window.characters_menu = characters_menu
window.upload_character = upload_character
window.download_character = download_character
window.set_global_highlight_color = set_global_highlight_color
window.layoutControlsHidden = layoutControlsHidden
window.emptyDescriptionsHidden = emptyDescriptionsHidden
window.helpModal = helpModal
window.toggleMessaging = toggleMessaging
window.developmentHook = developmentHook

import { show_context_menu, set_trait_collection_highlight_color, remove_trait_collection_highlight_color, set_style, context_menu_remove_item, move_to_top, move_to_bottom, move_up, move_down, move_to_other_column, move_to_next_page, move_to_previous_page } from "./traitGroupContextMenu.js"
window.show_context_menu = show_context_menu
window.set_trait_collection_highlight_color = set_trait_collection_highlight_color
window.remove_trait_collection_highlight_color = remove_trait_collection_highlight_color
window.set_style = set_style
window.context_menu_remove_item = context_menu_remove_item
window.move_to_top = move_to_top
window.move_to_bottom = move_to_bottom
window.move_up = move_up
window.move_down = move_down
window.move_to_other_column = move_to_other_column
window.move_to_next_page = move_to_next_page
window.move_to_previous_page = move_to_previous_page

import { set_trait_group_name } from "./traitGroupStyle.js"
window.set_trait_group_name = set_trait_group_name

import "./windowOnload.js"