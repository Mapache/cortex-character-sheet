import { app, analytics, auth, db } from "./firebase.js"
import { load_character } from "./load.js"
import { menu, menuEntry, menuDivider, menuSubMenu } from "./menu.js"
import { Modal } from "./modal.js"
import { save_character } from "./save.js"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, collection, addDoc, setDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

const generateHash = (string) => {
	let hash = 0
	for (const char of string) {
		hash = (hash << 5) - hash + char.charCodeAt(0)
		hash |= 0 // Constrain to 32bit integer
	}
	return hash
}

export class Campaign {
	constructor(name, id) {
		this.name = name
		this.id = id
		this.adminUsers = []
		this.editUsers = []
		this.viewUsers = []
	}
}

const campaignConverter = {
	toFirestore: (campaign) => {
		return {
			name: campaign.name,
			adminUsers: campaign.adminUsers,
			editUsers: campaign.editUsers,
			viewUsers: campaign.viewUsers,
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		let campaign = new Campaign(data.name, snapshot.id)
		campaign.adminUsers = data.adminUsers
		campaign.editUsers = data.editUsers
		campaign.viewUsers = data.viewUsers
		return campaign
	}
}

export class CharacterSheet {
	constructor(json) {
		this.json = json
		this.name = json.characterName
		this.id = generateHash(json.characterName).toString()
	}
}

const characterSheetConverter = {
	toFirestore: (characterSheet) => {
		return {
			json: JSON.stringify(characterSheet.json),
			name: characterSheet.name
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		return new CharacterSheet(JSON.parse(data.json))
	}
}

const defaultCampaignName = "Default"
const campaignsCollection = "campaigns"
const charactersCollection = "characters"

export class Cloud {
	constructor() {
		this.currentCampaign = null
		this.defaultCampaign = null
		this.campaigns = []
		this.currentCharacterSheets = null
	}

	async signIn() {
		const provider = new GoogleAuthProvider()
		signInWithPopup(auth, provider)
			.then((result) => {
				const credential = GoogleAuthProvider.credentialFromResult(result)
				const token = credential.accessToken
				const user = result.user
				// IdP data available using getAdditionalUserInfo(result)
			}).catch((error) => {
				const errorCode = error.code
				const errorMessage = error.errorMessage
				const email = error.customData.email
				const credential = GoogleAuthProvider.credentialFromError(error)
				console.log("Sign-in error for ", error.customData.email, error.code, error.message)
			})
	}

	async requireSignIn() {
		if (!auth.currentUser) {
			await signIn()
		}
		return auth.currentUser
	}

	findDefaultCampaign(user) {
		for (const [index, campaign] of this.campaigns.entries()) {
			if (campaign.name == defaultCampaignName &&
				campaign.adminUsers.length == 1 && campaign.adminUsers[0] == user.uid &&
				campaign.editUsers.length == 1 && campaign.editUsers[0] == user.uid &&
				campaign.viewUsers.length == 1 && campaign.viewUsers[0] == user.uid
			) {
				this.defaultCampaign = campaign
				this.campaigns.splice(index, 1)
				return
			}
		}
		this.defaultCampaign = null
	}

	createDefaultCampaign(user) {
		this.defaultCampaign = new Campaign(defaultCampaignName, null)
		this.defaultCampaign.id = user.uid
		this.defaultCampaign.adminUsers = [user.uid]
		this.defaultCampaign.editUsers = [user.uid]
		this.defaultCampaign.viewUsers = [user.uid]
	}

	async getCampaigns() {
		const user = await this.requireSignIn()

		const querySnapshot = await getDocs(
			collection(db, campaignsCollection).withConverter(campaignConverter),
			where("viewUsers", "array-contains", user.uid))
		this.campaigns = querySnapshot.docs.map((doc) => doc.data())

		this.findDefaultCampaign(user)
		if (this.defaultCampaign === null) {
			this.createDefaultCampaign(user)
			const docRef = await setDoc(doc(db, campaignsCollection, this.defaultCampaign.id).withConverter(campaignConverter), this.defaultCampaign)
		}

		if (this.currentCampaign === null) {
			this.currentCampaign = this.defaultCampaign
		}

		console.log("currentCampaign = ", this.currentCampaign)
		console.log("defaultCampaign = ", this.defaultCampaign)
		console.log("campaigns = ", this.campaigns)
	}

	async requireCurrentCampaign() {
		if (this.currentCampaign === null) {
			await this.getCampaigns()
		}
	}

	async getCharactersForCurrentCampaign() {
		await this.requireSignIn()
		await this.requireCurrentCampaign()

		const querySnapshot = await getDocs(collection(db, campaignsCollection, this.currentCampaign.id, charactersCollection).withConverter(characterSheetConverter))
		this.currentCharacterSheets = querySnapshot.docs.map((doc) => doc.data())
		this.currentCharacterSheets.sort((a, b) => a.name.localeCompare(b.name))
	}

	async requireCurrentCharacterSheets() {
		if (this.currentCharacterSheets === null) {
			await this.getCharactersForCurrentCampaign()
		}
	}

	async uploadCharacter() {
		await this.requireSignIn()
		await this.requireCurrentCampaign()
		await this.requireCurrentCharacterSheets()

		let json = save_character()
		let sheet = new CharacterSheet(json)
		console.log("sheet = ", sheet)
		console.log("sheet.id = ", sheet.id)

		// Update currentCharacterSheets
		for (const [index, characterSheet] of this.currentCharacterSheets.entries()) {
			if (characterSheet.name == sheet.name) {
				this.currentCharacterSheets.splice(index, 1)
				break
			}
		}
		// Whether or not we removed an old one with this name, always add the new one
		this.currentCharacterSheets.push(sheet)
		this.currentCharacterSheets.sort((a, b) => a.name.localeCompare(b.name))
		console.log(this.currentCharacterSheets)

		try {
			await setDoc(doc(db, campaignsCollection, this.currentCampaign.id, charactersCollection, sheet.id).withConverter(characterSheetConverter), sheet)
			console.log("Document written with ID: ", sheet.id)
		} catch (error) {
			console.error("Error adding document: ", error)
		}
	}

}

let cloud = new Cloud()

export async function campaigns_menu(e) {
	await cloud.getCampaigns()

	const campaignsMenu = new Modal()

	let entries = [
		menuEntry(defaultCampaignName, function (e) {
			cloud.currentCampaign = cloud.defaultCampaign
			campaignsMenu.hide()
		}),
		menuDivider()
	]
	for (const campaign of cloud.campaigns) {
		entries.push(menuEntry(campaign.name, function (e) {
			cloud.currentCampaign = campaign
			campaignsMenu.hide()
		}))
	}
	if (cloud.campaigns.length > 0) {
		entries.push(menuDivider())
	}
	entries.push(menuEntry("Create New Campaign…", function (e) {
		// TODO: Create New Campaign
		campaignsMenu.hide()
	}))

	campaignsMenu.modal = menu(entries)
	campaignsMenu.showAtEvent(e)
}

export async function characters_menu(e) {
	await cloud.getCharactersForCurrentCampaign()

	const charactersMenu = new Modal()

	let entries = []
	for (const characterSheet of cloud.currentCharacterSheets) {
		entries.push(menuEntry(characterSheet.name, function (e) {
			load_character(characterSheet.json)
			charactersMenu.hide()
		}))
	}

	charactersMenu.modal = menu(entries)
	charactersMenu.showAtEvent(e)
}

export async function upload_character(e) {
	await cloud.uploadCharacter()
}