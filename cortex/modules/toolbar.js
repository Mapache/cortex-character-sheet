import { cloud } from "./cloud.js"
import { load_character } from "./load.js"
import { menu, menuEntry, menuDivider, menuSubMenu } from "./menu.js"
import { Modal } from "./modal.js"
import { save_character } from "./save.js"
import { apply_highlight_color } from "./traitGroupStyle.js"
import { ToggleableStyle } from "./toggleableStyle.js"

// File Section

function titleCase(string) {
	return string.replace(
		/\w\S*/g,
		text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
	)
}

export async function campaigns_menu(e) {
	await cloud.requireCurrentCampaign()

	const campaignsMenu = new Modal()

	let entries = [
		menuEntry(cloud.defaultCampaign.name, function (e) {
			cloud.switchCampaign(cloud.defaultCampaign)
			campaignsMenu.hide()
		}),
		menuDivider()
	]
	for (const campaign of cloud.campaigns) {
		entries.push(menuEntry(campaign.name, function (e) {
			cloud.switchCampaign(campaign)
			campaignsMenu.hide()
		}))
	}
	if (cloud.campaigns.length > 0) {
		entries.push(menuDivider())
	}
	entries.push(menuEntry("Create New Campaign…", function (e) {
		campaignsMenu.hide()
		campaignNameModal.showAtEvent(e)
	}))

	campaignsMenu.modal = menu(entries)
	campaignsMenu.showAtEvent(e)
}

export const campaignNameModal = await Modal.build("campaign-name-modal", function () {
	let name = campaignNameModal.modal.querySelector("input").value
	cloud.createNewCampaign(name)
})

export async function characters_menu(e) {
	await cloud.requireCurrentCharacterSheets()

	const charactersMenu = new Modal()

	let entries = []
	for (const characterSheet of cloud.currentCharacterSheets) {
		entries.push(menuEntry(titleCase(characterSheet.name), function (e) {
			load_character(characterSheet.json)
			charactersMenu.hide()
		}))
	}

	charactersMenu.modal = menu(entries)
	charactersMenu.showAtEvent(e)
}

export async function upload_character(e) {
	let json = save_character()
	await cloud.uploadCharacter(json)
}

export function download_character(e) {
	let json = save_character()
	download(json)
}

function download(json) {
	let uri = encodeURI("data:application/json;charset=utf-8," + JSON.stringify(json))
	uri = uri.replace(/#/g, "%23")
	let link = document.createElement("a")
	link.setAttribute("href", uri)
	let characterName = json.characterName
	if (characterName == "") characterName = "Unnamed Character"
	link.setAttribute("download", characterName + ".json")
	document.body.appendChild(link) // Required for FF
	link.click()
	link.remove()
}

// Display Section

export function set_global_highlight_color(e) {
	let colorPicker = document.getElementById("global-highlight-picker")
	let root = document.querySelector(":root")
	apply_highlight_color(root, colorPicker.value)
}

// Show layout controls by default
export const layoutControlsHidden = new ToggleableStyle(
	"#toggle-layout-controls",
	"controls-hidden",
	`
		.pages .no-print {
			display: none !important;
		}
	`,
	"",
	false)

// Hide empty trait descriptions by default
export const emptyDescriptionsHidden = new ToggleableStyle(
	"#toggle-empty-descriptions",
	"descriptions-hidden",
	`
		.trait-description:empty {
			display: none !important;
		}
		.trait-description:empty:focus {
			display: inline !important;
		}
	`,
	`
		.trait-description:empty {
			background: linear-gradient(-45deg, #eee 40%, #fafafa 50%, #eee 60%);
			background-size: 300%;
			animation: shimmer 4s infinite linear;
		}
		@keyframes shimmer {
			0% {
				background-position-x: 100%;
			}
			25%, 100% {
				background-position-x: 0%;
			}
		}
	`,
	true)

// Help Section

export const helpModal = await Modal.build("help-modal", function () { })