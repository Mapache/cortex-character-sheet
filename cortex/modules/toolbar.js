import { CampaignPermissions, cloud } from "./cloud.js"
import { Flags } from "./flags.js"
import { titleCase, formatRelativeTime } from "./formatting.js"
import { nuke_character, load_character } from "./load.js"
import { menu, menuEntry, menuDivider, menuLabel, menuTextInput } from "./menu.js"
import { Messages } from "./messages.js"
import { Modal } from "./modal.js"
import { save_character } from "./save.js"
import { copyShareUrl } from "./share.js"
import { apply_highlight_color } from "./traitGroupStyle.js"
import { ToggleableStyle } from "./toggleableStyle.js"
import { layoutControlsHidden, emptyDescriptionsHidden } from "./toggleableStyles.js"

// MARK: File Section

export async function campaigns_menu(e) {
	await cloud.requireCurrentCampaign()

	const campaignsMenu = new Modal()

	let entries = [
		menuEntry(cloud.defaultCampaign.name, (e) => {
			cloud.switchCampaign(cloud.defaultCampaign)
			campaignsMenu.hide()
		}),
		menuDivider()
	]
	for (const campaign of cloud.campaigns) {
		let subMenuEntries = null
		if (cloud.accessFor(campaign.id) === CampaignPermissions.admin) {
			subMenuEntries = [
				menuLabel("Rename campaign:"),
				menuTextInput("New campaign name", campaign.name, (name) => {
					cloud.renameCampaign(campaign, name)
					campaignsMenu.hide()
				}),
				menuDivider(),
				menuEntry("Share as editable…", async (e) => {
					await copyShareUrl(campaign, CampaignPermissions.editor)
					campaignsMenu.hide()
				}),
				menuEntry("Share as read-only…", async (e) => {
					await copyShareUrl(campaign, CampaignPermissions.reader)
					campaignsMenu.hide()
				})
			]
		}
		entries.push(menuEntry(campaign.name, (e) => {
			cloud.switchCampaign(campaign)
			campaignsMenu.hide()
		}, subMenuEntries))
	}
	if (cloud.campaigns.length > 0) {
		entries.push(menuDivider())
	}
	entries.push(menuEntry("Create New Campaign…", null, [
		menuLabel("Enter name for new campaign:"),
		menuTextInput("New campaign name", "", (name) => {
			cloud.createNewCampaign(name)
			campaignsMenu.hide()
		})
	]))

	campaignsMenu.modal = menu(entries)
	campaignsMenu.showAtEvent(e)
}

export async function characters_menu(e) {
	await cloud.requireCurrentCharacterSheets()

	const charactersMenu = new Modal()

	let entries = []
	for (const characterSheet of await cloud.sortedCurrentCharacterSheets()) {
		let rollbackMenuEntry = menuEntry("Load older versions…", async (e) => {
			// Dynamically expand this submenu
			rollbackMenuEntry.onclick = null
			let versions = await cloud.versionsForCharacter(characterSheet)
			if (versions.length === 0) {
				rollbackMenuEntry.innerText = "No older versions"
				return
			}
			rollbackMenuEntry.innerText = "Older versions:"
			let rollbackEntries = versions.map(
				(version) =>
					menuEntry(formatRelativeTime(version.saved), (e) => {
						load_character(version.json)
						cloud.updateURLForCharacter(version)
						charactersMenu.hide()
					})
			)
			rollbackMenuEntry.after(...rollbackEntries)
		})
		entries.push(menuEntry(titleCase(characterSheet.name), (e) => {
			load_character(characterSheet.json)
			cloud.updateURLForCharacter(characterSheet)
			charactersMenu.hide()
		}, [rollbackMenuEntry]))
	}
	if (entries.length > 0) {
		entries.push(menuDivider())
	}
	entries.push(menuEntry("New Blank Character Sheet", (e) => {
		nuke_character()
		cloud.updateURLForCharacter(null)
		charactersMenu.hide()
	}))

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
	if (characterName === "") characterName = "Unnamed Character"
	link.setAttribute("download", characterName + ".json")
	document.body.appendChild(link) // Required for FF
	link.click()
	link.remove()
}

// MARK: Display Section

export function set_global_highlight_color(e) {
	let colorPicker = document.getElementById("global-highlight-picker")
	let root = document.querySelector(":root")
	apply_highlight_color(root, colorPicker.value)
}

export { layoutControlsHidden, emptyDescriptionsHidden }

// MARK: Messaging

export async function toggleMessaging(e) {
	Messages.messagesForCurrentCampaign()?.toggle()
}

// MARK: Help Section

export const helpModal = await Modal.build("help-modal")

// MARK: Development Section

const developmentHidden = new ToggleableStyle(
	".development",
	"development-hidden",
	"development-visible",
	`
		.development {
			display: none !important;
		}
	`,
	"",
	!Flags.development || !Flags.useDevelopmentHook)

export async function developmentHook(e) {
	if (!Flags.development) {
		console.error("Attempting to run development code on prod!")
		return
	}
	// Do something developmental.
}