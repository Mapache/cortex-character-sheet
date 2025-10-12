import { app, analytics, auth, db } from "./firebase.js"
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, collection, query, addDoc, setDoc, updateDoc, getDoc, getDocs, where, documentId } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

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
	}

	static unauthorized = 0
	static reader = 1
	static editor = 2
	static admin = 3
}

const campaignConverter = {
	toFirestore: (campaign) => {
		return {
			name: campaign.name,
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		let campaign = new Campaign(data.name, snapshot.id)
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
		permissions[Campaign.reader + crypto.randomUUID()] = Campaign.reader
		permissions[Campaign.editor + crypto.randomUUID()] = Campaign.editor
		permissions[Campaign.admin + crypto.randomUUID()] = Campaign.admin
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
		this.campaigns = null
		this.currentCharacterSheets = null
	}

	// MARK: Authentication

	async signIn() {
		const provider = new GoogleAuthProvider()
		await signInWithPopup(auth, provider)
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
			await this.signIn()
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

	accessFor(campaignId) {
		const key = this.userPermissions.campaigns[campaignId]
		return this.accessForKey(key)
	}

	accessForKey(key) {
		if (!key) {
			return Campaign.unauthorized
		}
		return parseInt(key[0])
	}

	async updateAccessKey(campaignId, key) {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		if (this.accessFor(campaignId) > this.accessForKey(key)) {
			// Don't downgrade access
			return
		}

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

	async createDefaultCampaign() {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		this.defaultCampaign = await this.createNewCampaignWithId(defaultCampaignName, user.uid)
	}

	async getCampaigns() {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		const campaignIds = Object.keys(this.userPermissions.campaigns)
		if (campaignIds.length > 0) {
			const q = query(
				collection(db, campaignsCollection).withConverter(campaignConverter),
				where(documentId(), "in", campaignIds))
			const querySnapshot = await getDocs(q)

			this.campaigns = querySnapshot.docs.map((doc) => doc.data())
			this.sortCampaigns()
		}

		if (this.findDefaultCampaign(user) === null) {
			await this.createDefaultCampaign()
		}

		if (this.currentCampaign === null) {
			await this.switchCampaign(this.defaultCampaign)
		}

		if (0) {
			console.log("user.uid = ", user.uid)
			console.log("this.userPermissions = ", this.userPermissions)
			console.log("this.defaultCampaign = ", this.defaultCampaign)
			console.log("this.campaigns = ", this.campaigns)
			console.log("this.currentCampaign = ", this.currentCampaign)
		}
	}

	sortCampaigns() {
		this.campaigns.sort((a, b) => a.name.localeCompare(b.name))
	}

	async requireCampaigns() {
		if (this.campaigns === null) {
			await this.getCampaigns()
		}
	}

	async requireCurrentCampaign() {
		if (this.currentCampaign === null) {
			await this.getCampaigns()
		}
	}

	async createNewCampaign(name) {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()
		await this.requireCampaigns()

		const campaignId = doc(collection(db, campaignsCollection)).id
		const campaign = await this.createNewCampaignWithId(name, campaignId)
		this.campaigns.push(campaign)
		this.sortCampaigns()
		await this.switchCampaign(campaign)
	}

	async createNewCampaignWithId(name, campaignId) {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		let campaign = new Campaign(name, campaignId)
		const permissions = CampaignPermissions.generate()

		try {
			// First, grant ourselves the permission, then define the permission, then create the campaign.
			await this.updateAccessKey(campaignId, permissions.keyFor(Campaign.admin))
			await setDoc(doc(db, campaignPermissionsCollection, campaignId).withConverter(campaignPermissionsConverter), permissions)
			await setDoc(doc(db, campaignsCollection, campaignId).withConverter(campaignConverter), campaign)
			console.log(`Campaign ${name} written with ID ${campaignId} `)
			return campaign
		} catch (error) {
			console.error(`Error adding Campaign ${name}: `, error)
		}
	}

	async campaignWithId(campaignId) {
		await this.requireSignIn()
		await this.requireCampaigns()

		return this.campaigns.filter((campaign) => campaign.id == campaignId)[0]
	}

	async switchCampaignId(campaignId) {
		await this.switchCampaign(await this.campaignWithId(campaignId))
	}

	async switchCampaign(campaign) {
		await this.requireSignIn()

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