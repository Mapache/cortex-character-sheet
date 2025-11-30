import { asyncMap } from "./async.js"
import { CampaignPermissions, Cloud, cloud } from "./cloud.js"
import { whenInteractive } from "./defer.js"
import { Flags } from "./flags.js"
import { formatRelativeTime, titleCase } from "./formatting.js"
import { displayCharacterJson, nukeDisplayedCharacter } from "./load.js"
import { menu, menuDivider, menuEntry, menuLabel, menuTextInput } from "./menu.js"
import { Messages } from "./messages.js"
import { Modal, infoModal } from "./modal.js"
import { jsonForDisplayedCharacter } from "./save.js"
import { copyShareUrl } from "./share.js"
import { ToggleableStyle } from "./toggleableStyle.js"
import { emptyDescriptionsHidden, layoutControlsHidden } from "./toggleableStyles.js"
import { globalHighlightColorPicker } from "./traitGroupStyle.js"

// MARK: Tool

class Tool {
	/**
	 * @param {string} icon - Icon class 
	 * @param {string} tip - Help string
	 * @param {(event) => void} action 
	 * @param {boolean} [enabled=true]
	 * @param {Node} [customNode=null]
	 */
	constructor(icon, tip, action, disabledAction, enabled = true, customNode = null) {
		this.icon = icon
		this.tip = tip
		this.action = action
		this.disabledAction = disabledAction

		this.enabled = enabled
		this.node = customNode ?? (() => {
			const node = document.createElement("i")
			node.classList.add("icon", this.icon)
			node.title = this.tip
			node.onclick = (e) => {
				if (this.enabled) {
					this.action(e)
				} else {
					this.disabledAction?.(e)
				}
			}
			return node
		})()
	}

	static custom(node, enabled = true) {
		return new Tool(null, null, null, enabled, node)
	}

	enable() {
		this.enabled = true
		this.node.classList.remove("disabled")
	}

	disable() {
		this.enabled = false
		this.node.classList.add("disabled")
	}

	setEnabled(enabled) {
		if (enabled) {
			this.enable()
		} else {
			this.disable()
		}
	}

	toggle() {
		this.setEnabled(!this.enabled)
	}
}

// MARK: File Section

export const campaigns = new Tool("campaigns", "Campaigns", async (e) => {
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
					const shareUrl = await copyShareUrl(campaign, CampaignPermissions.editor)
					campaignsMenu.hide()
					infoModal.title.innerHTML = `
						Sharing link copied to clipboard:
					`
					infoModal.info.innerHTML = `
						<a href="${shareUrl}">${shareUrl}</a>
						<p>Anyone who visits this link will be granted permission to edit and save characters
						in the ${campaign.name} campaign and use the dice rolling and chat system.</p>
					`
					infoModal.show()
				}),
				menuEntry("Share as read-only…", async (e) => {
					const shareUrl = await copyShareUrl(campaign, CampaignPermissions.reader)
					campaignsMenu.hide()
					infoModal.title.innerHTML = `
						Sharing link copied to clipboard:
					`
					infoModal.info.innerHTML = `
						<a href="${shareUrl}">${shareUrl}</a>
						<p>Anyone who visits this link will be granted read-only permission to view characters
						in the ${campaign.name} campaign.</p>
					`
					infoModal.show()
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
}, async (e) => {
	cloud.requireCurrentCampaign()
})

export const characters = new Tool("characters", "Characters", async (e) => {
	await cloud.requireCurrentCharacterSheets()

	const charactersMenu = new Modal()

	async function characterEntries(archived) {
		let entries = []
		for (const characterSheet of await cloud.sortedCurrentCharacterSheets(archived)) {
			function characterSelected(character) {
				return (e) => {
					displayCharacterJson(character.json)
					cloud.updateURLForCharacter(character)
					charactersMenu.hide()
				}
			}
			async function menuEntryForVersion(version) {
				return menuEntry(
					`${formatRelativeTime(version.saved)} by ${await cloud.displayNameForUserId(version.author)}`,
					characterSelected(version))
			}
			let savedBefore = characterSheet.saved
			let rollbackMenuEntry = menuEntry("Load older versions…", async (e) => {
				// Dynamically expand this submenu
				let versions = await cloud.versionsForCharacter(characterSheet, savedBefore)
				if (versions.length) {
					savedBefore = versions.at(-1)?.saved
					let rollbackEntries = await asyncMap(versions, menuEntryForVersion)
					rollbackMenuEntry.before(...rollbackEntries)
				}
				if (versions.length < Cloud.characterSheetVersionsBatchSize) {
					rollbackMenuEntry.onclick = null
					rollbackMenuEntry.classList.add("disabled")
					rollbackMenuEntry.innerText = "No older versions"
				}
			})
			let subMenuEntries = [
				await menuEntryForVersion(characterSheet),
				rollbackMenuEntry,
			]
			if (!archived) {
				subMenuEntries.push(menuDivider())
				subMenuEntries.push(menuEntry("Archive Character", (e) => {
					cloud.archiveCharacter(characterSheet)
					charactersMenu.hide()
				}))
			}
			entries.push(menuEntry(titleCase(characterSheet.name), characterSelected(characterSheet), subMenuEntries))
		}
		return entries
	}

	let entries = await characterEntries(false)
	if (entries.length > 0) {
		entries.push(menuDivider())
	}
	entries.push(menuEntry("New Blank Character Sheet", (e) => {
		nukeDisplayedCharacter()
		cloud.updateURLForCharacter(null)
		charactersMenu.hide()
	}))
	let archivedCharacterEntries = await characterEntries(true)
	if (archivedCharacterEntries.length) {
		entries.push(menuDivider())
		entries.push(menuEntry("Archived Characters", null, archivedCharacterEntries))
	}

	charactersMenu.modal = menu(entries)
	charactersMenu.showAtEvent(e)
}, async (e) => {
	cloud.requireCurrentCampaign()
})

export const uploadCharacter = new Tool("upload", "Save Sheet to Cloud", async (e) => {
	let json = jsonForDisplayedCharacter()
	await cloud.uploadCharacter(json)
}, async (e) => {
	cloud.requireCurrentCampaign()
})

export const downloadCharacter = new Tool("download", "Download Sheet to File", async (e) => {
	let json = jsonForDisplayedCharacter()
	download(json)
})

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

export const globalHighlightColor = Tool.custom(globalHighlightColorPicker)

export const toggleLayoutControlsHidden = new Tool("toggle-layout-controls", "Toggle Layout Controls", async (e) => {
	layoutControlsHidden.toggle(e)
})

export const toggleEmptyDescriptionsHidden = new Tool("toggle-empty-descriptions", "Toggle Empty Descriptions", async (e) => {
	emptyDescriptionsHidden.toggle(e)
})

// MARK: Messaging

export const toggleMessaging = new Tool("toggle-messaging", "Messages & Dice Rolls", async (e) => {
	Messages.messagesForCurrentCampaign()?.toggle()
})

// MARK: Help Section

export const helpModal = await Modal.build("help-modal")
helpModal.modal.querySelector("#close button").onclick = (e) => helpModal.hide()
export const toggleHelp = new Tool("help", "Help", async (e) => {
	helpModal.show()
})

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

export const developmentHook = new Tool("development-hook", "Development Hook", async (e) => {
	if (!Flags.development) {
		console.error("Attempting to run development code on prod!")
		return
	}
	// Do something developmental.
})

// MARK: Toolbar

const prodToolbarSections = [
	[
		campaigns,
		characters,
		uploadCharacter,
		downloadCharacter,
	],
	[
		globalHighlightColor,
		toggleLayoutControlsHidden,
		toggleEmptyDescriptionsHidden,
	],
	[
		toggleMessaging,
	],
	[
		toggleHelp,
	],
]
const devToolbarSection =
	[
		developmentHook,
	]
const toolbarSections = (Flags.development && Flags.useDevelopmentHook)
	? prodToolbarSections.concat([devToolbarSection])
	: prodToolbarSections
const toolbarNodes = (() => {
	let nodes = []
	for (const section of toolbarSections) {
		for (const tool of section) {
			nodes.push(tool.node)
		}
		nodes.push(document.createElement("hr"))
	}
	return nodes.slice(0, -1)
})()

whenInteractive(() => {
	const toolbar = document.getElementById("toolbar")
	toolbar.replaceChildren(...toolbarNodes)
	// The ToggleableStyles will have been created before the tools that need to reference them,
	// so correctly apply the initial style to the tools.
	layoutControlsHidden.applyControlClass()
	emptyDescriptionsHidden.applyControlClass()

	didSwitchCampaign(cloud.currentCampaign)
	cloud.events.addEventListener("campaignSwitched", (e) => {
		if (e.detail.nameOnly) {
			displayCampaignName(e.detail.campaign)
		} else {
			didSwitchCampaign(e.detail.campaign)
		}
	})
})

export function displayCampaignName(campaign) {
	document.getElementById("current-campaign").innerText = campaign?.name ?? ""
}

export function didSwitchCampaign(campaign) {
	if (cloud.user) {
		campaigns.enable()
	} else {
		campaigns.disable()
	}
	displayCampaignName(campaign)
	switch (cloud.accessFor(campaign?.id)) {
		case CampaignPermissions.unauthorized:
			characters.disable()
			uploadCharacter.disable()
			toggleMessaging.disable()
			break
		case CampaignPermissions.reader:
			characters.enable()
			uploadCharacter.disable()
			toggleMessaging.disable()
			break
		case CampaignPermissions.editor:
			characters.enable()
			uploadCharacter.enable()
			toggleMessaging.enable()
			break
		case CampaignPermissions.admin:
			characters.enable()
			uploadCharacter.enable()
			toggleMessaging.enable()
			break
	}
}