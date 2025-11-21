import { CampaignPermissions, cloud } from "./cloud.js"
import { whenInteractive } from "./defer.js"
import { Flags } from "./flags.js"
import { formatRelativeTime, titleCase } from "./formatting.js"
import { load_character, nuke_character } from "./load.js"
import { menu, menuDivider, menuEntry, menuLabel, menuTextInput } from "./menu.js"
import { Messages } from "./messages.js"
import { Modal } from "./modal.js"
import { save_character } from "./save.js"
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
	constructor(icon, tip, action, enabled = true, customNode = null) {
		this.icon = icon
		this.tip = tip
		this.action = action

		this.enabled = enabled
		this.node = customNode ?? (() => {
			const node = document.createElement("i")
			node.classList.add("icon", this.icon)
			node.title = this.tip
			node.onclick = (e) => {
				if (this.enabled) {
					this.action()
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
})

export const characters = new Tool("characters", "Characters", async (e) => {
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
})

export const uploadCharacter = new Tool("upload", "Save Sheet to Cloud", async (e) => {
	let json = save_character()
	await cloud.uploadCharacter(json)
})

export const downloadCharacter = new Tool("download", "Download Sheet to File", async (e) => {
	let json = save_character()
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
})