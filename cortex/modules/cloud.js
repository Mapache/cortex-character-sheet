import { app, analytics, auth, db } from "./firebase.js"
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, collection, addDoc, setDoc, updateDoc, getDoc, getDocs, where, documentId } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

// MARK: Utilities

const generateHash = (string) => {
	let hash = 0
	for (const char of string) {
		hash = (hash << 5) - hash + char.charCodeAt(0)
		hash |= 0 // Constrain to 32bit integer
	}
	return hash
}

// MARK: Data Models

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

// MARK: Permissions Models

export class CampaignPermissions {
	// permissions maps from UUID access keys to access levels (admin / editor / reader)
	constructor(permissions) {
		this.permissions = permissions
	}

	keyFor(access) {
		for (const [key, value] of Object.entries(this.permissions)) {
			if (value == access) {
				return key
			}
		}
		return null
	}

	static generate() {
		let permissions = {}
		permissions[crypto.randomUUID()] = Campaign.reader
		permissions[crypto.randomUUID()] = Campaign.editor
		permissions[crypto.randomUUID()] = Campaign.admin
		return new CampaignPermissions(permissions)
	}
}

const campaignPermissionsConverter = {
	toFirestore: (campaignPermissions) => {
		return {
			permissions: campaignPermissions.permissions,
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		return new CampaignPermissions(data.permissions)
	}
}

export class UserPermissions {
	// campaigns maps from Campaign ids to CampaignPermissions UUID access keys
	constructor(campaigns) {
		this.campaigns = campaigns
	}
}

const userPermissionsConverter = {
	toFirestore: (campaignPermissions) => {
		return {
			campaigns: campaignPermissions.campaigns,
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		return new UserPermissions(data.campaigns)
	}
}

// MARK: Cloud

const defaultCampaignName = "Default"
const campaignsCollection = "campaigns"
const charactersCollection = "characters"
const campaignPermissionsCollection = "campaignPermissions"
const userPermissionsCollection = "userPermissions"

export class Cloud {
	constructor() {
		this.userPermissions = null
		this.currentCampaign = null
		this.defaultCampaign = null
		this.campaigns = []
		this.currentCharacterSheets = null
	}

	// MARK: Authentication

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

	// MARK: Permissions

	async getUserPermissions() {
		const user = await this.requireSignIn()

		const docSnapshot = await getDoc(doc(db, userPermissionsCollection, user.uid).withConverter(userPermissionsConverter))
		if (docSnapshot.exists()) {
			this.userPermissions = docSnapshot.data()
		} else {
			this.userPermissions = new UserPermissions({})
			await setDoc(doc(db, userPermissionsCollection, user.uid).withConverter(userPermissionsConverter), this.userPermissions)
		}
	}

	async requireUserPermissions() {
		if (this.userPermissions === null) {
			await this.getUserPermissions()
		}
	}

	async updateAccessKey(campaignId, key) {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		this.userPermissions.campaigns[campaignId] = key

		let permission = {}
		permission["campaigns." + campaignId] = key
		await updateDoc(doc(db, userPermissionsCollection, user.uid), permission)
	}

	async accessKey(campaign, access) {
		const user = await this.requireSignIn()
		const campaignId = campaign.id
		try {
			const docSnapshot = await getDoc(doc(db, campaignPermissionsCollection, campaignId).withConverter(campaignPermissionsConverter))
			if (docSnapshot.exists()) {
				const permissions = docSnapshot.data()
				return permissions.keyFor(access)
			} else {
				console.error("Unable to read access keys for ", campaign.name)
			}
		} catch (error) {
			console.error("Error reading access keys for campaign: ", error)
		}
		return null
	}

	// MARK: Campaigns

	findDefaultCampaign(user) {
		for (const [index, campaign] of this.campaigns.entries()) {
			if (campaign.id == user.uid) {
				this.campaigns.splice(index, 1)
				this.defaultCampaign = campaign
				return campaign
			}
		}
		this.defaultCampaign = null
		return null
	}

	async createDefaultCampaign(user) {
		this.defaultCampaign = new Campaign(defaultCampaignName, user.uid)
		this.defaultCampaign.users[user.uid] = Campaign.admin
		const permissions = CampaignPermissions.generate()
		try {
			const campaignId = this.defaultCampaign.id
			await setDoc(doc(db, campaignsCollection, campaignId).withConverter(campaignConverter),
				this.defaultCampaign)
			await setDoc(doc(db, campaignPermissionsCollection, campaignId).withConverter(campaignPermissionsConverter),
				permissions)
			await this.updateAccessKey(campaignId, permissions.keyFor(Campaign.admin))
		} catch (error) {
			console.error("Error adding default Campaign: ", error)
		}
	}

	async getCampaigns() {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		const querySnapshot = await getDocs(
			collection(db, campaignsCollection).withConverter(campaignConverter),
			where(documentId(), "in", Object.keys(this.userPermissions.campaigns)))

		this.campaigns = querySnapshot.docs.map((doc) => doc.data())
		this.campaigns.sort((a, b) => a.name.localeCompare(b.name))

		if (this.findDefaultCampaign(user) === null) {
			await this.createDefaultCampaign(user)
		}

		if (this.currentCampaign === null) {
			await this.switchCampaign(this.defaultCampaign)
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
		const permissions = CampaignPermissions.generate()

		try {
			const docRef = await addDoc(collection(db, campaignsCollection).withConverter(campaignConverter), campaign)
			const campaignId = docRef.id
			console.log("Campaign written with ID: ", campaignId)
			await setDoc(doc(db, campaignPermissionsCollection, campaignId).withConverter(campaignPermissionsConverter), permissions)
			await this.updateAccessKey(campaignId, permissions.keyFor(Campaign.admin))

			await this.getCampaigns()
			await this.switchCampaign(this.campaigns.filter((campaign) => campaign.id == campaignId)[0])
		} catch (error) {
			console.error("Error adding Campaign: ", error)
		}
	}

	async switchCampaign(campaign) {
		this.currentCampaign = campaign
		document.getElementById("current-campaign").innerText = campaign.name
		await this.getCharactersForCurrentCampaign()
	}

	// MARK: Characters

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