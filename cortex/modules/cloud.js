import { app, analytics, auth, db } from "./firebase.js"
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
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
		this.users = {}
	}

	static reader = 1
	static editor = 2
	static admin = 3
}

const campaignConverter = {
	toFirestore: (campaign) => {
		return {
			name: campaign.name,
			users: campaign.users,
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		let campaign = new Campaign(data.name, snapshot.id)
		campaign.users = data.users
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

	// Authentication

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
				console.error("Sign-in error for ", error.customData.email, error.code, error.message)
			})
	}

	async requireSignIn() {
		if (!auth.currentUser) {
			await signIn()
		}
		return auth.currentUser
	}

	// Campaigns

	findDefaultCampaign(user) {
		for (const [index, campaign] of this.campaigns.entries()) {
			if (campaign.id == user.uid &&
				campaign.name == defaultCampaignName &&
				campaign.users[user.uid] == Campaign.admin
			) {
				this.campaigns.splice(index, 1)
				this.defaultCampaign = campaign
				return campaign
			}
		}
		this.defaultCampaign = null
		return null
	}

	createDefaultCampaign(user) {
		this.defaultCampaign = new Campaign(defaultCampaignName, user.uid)
		this.defaultCampaign.users[user.uid] = Campaign.admin
	}

	async getCampaigns() {
		const user = await this.requireSignIn()

		const querySnapshot = await getDocs(
			collection(db, campaignsCollection).withConverter(campaignConverter),
			where("users." + user.uid, ">", 0))
		this.campaigns = querySnapshot.docs.map((doc) => doc.data())

		if (this.findDefaultCampaign(user) === null) {
			this.createDefaultCampaign(user)
			const docRef = await setDoc(doc(db, campaignsCollection, this.defaultCampaign.id).withConverter(campaignConverter), this.defaultCampaign)
		}

		if (this.currentCampaign === null) {
			this.currentCampaign = this.defaultCampaign
		}
	}

	async requireCurrentCampaign() {
		if (this.currentCampaign === null) {
			await this.getCampaigns()
		}
	}

	async createNewCampaign(name) {
		const user = await this.requireSignIn()

		let campaign = new Campaign(name, null)
		campaign.users[user.uid] = Campaign.admin

		try {
			const docRef = await addDoc(collection(db, campaignsCollection).withConverter(campaignConverter), campaign)
			console.log("Campaign written with ID: ", docRef.id)
			await this.getCampaigns()
			this.switchCampaign(this.campaigns.filter((campaign) => campaign.id == docRef.id).firstElement)
		} catch (error) {
			console.error("Error adding Campaign: ", error)
		}
	}

	async switchCampaign(campaign) {
		this.currentCampaign = campaign
		await this.getCharactersForCurrentCampaign()
	}

	// Characters

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

	async uploadCharacter(json) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()
		await this.requireCurrentCharacterSheets()

		let sheet = new CharacterSheet(json)

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

		try {
			await setDoc(doc(db, campaignsCollection, this.currentCampaign.id, charactersCollection, sheet.id).withConverter(characterSheetConverter), sheet)
			console.log("Character Sheet written with ID: ", sheet.id)
		} catch (error) {
			console.error("Error adding Character Sheet: ", error)
		}
	}

}

export const cloud = new Cloud()