import { app, analytics, auth, db } from "./firebase.js"
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, collection, where, query, orderBy, limit, onSnapshot, addDoc, setDoc, updateDoc, getDoc, getDocs, documentId, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

import { setUrlHashWithoutHandling } from "./urlHashHandler.js"
import { Deferred } from "./util.js"

// MARK: Utilities

function generateHash(name) {
	let string = name.trim().toUpperCase()
	let hash = 0
	for (const char of string) {
		hash = (hash << 5) - hash + char.charCodeAt(0)
		hash |= 0 // Constrain to 32bit integer
	}
	// Avoid negative sign by adding 1<<32 (via rollover)
	return (hash - (1 << 31)).toString(36)
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
	// Either of json and jsonString can be null and inferred from the other.
	constructor(json, jsonString, saved) {
		this.json = json || JSON.parse(jsonString)
		this.jsonString = jsonString || JSON.stringify(json)
		this.name = this.json.characterName
		this.id = generateHash(this.name)
		this.saved = saved // Expected to be null for client-created objects
		Object.freeze(this) // Make it immutable
	}
}

const characterSheetConverter = {
	// In Firestore, the json field is actually the json string.
	toFirestore: (characterSheet) => {
		return {
			json: characterSheet.jsonString,
			name: characterSheet.name,
			saved: serverTimestamp(),
		}
	},
	fromFirestore: (snapshot, options) => {
		const data = snapshot.data(options)
		return new CharacterSheet(null, data.json, data.saved?.toDate())
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
		function generateKey(access) {
			// First digit encodes access level, then UUID with extraneous hyphens stripped
			return access + crypto.randomUUID().replace(/-/g, "")
		}
		let permissions = {}
		permissions[generateKey(Campaign.reader)] = Campaign.reader
		permissions[generateKey(Campaign.editor)] = Campaign.editor
		permissions[generateKey(Campaign.admin)] = Campaign.admin
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
const characterVersionsCollection = "versions"
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

	async waitForAuthInit() {
		return new Promise((resolve) => {
			const unsubscribe = onAuthStateChanged(auth, (user) => {
				unsubscribe() // Unsubscribe after the first state change
				resolve(user) // Resolve with the initial user state
			})
		})
	}

	async signIn() {
		const provider = new GoogleAuthProvider()
		return await signInWithPopup(auth, provider)
			.then((result) => {
				const credential = GoogleAuthProvider.credentialFromResult(result)
				const token = credential.accessToken
				const user = result.user
				return user
			}).catch((error) => {
				const errorCode = error.code
				const errorMessage = error.errorMessage
				const email = error.customData.email
				const credential = GoogleAuthProvider.credentialFromError(error)
				console.error("Sign-in error for ", error.customData.email, error.code, error.message)
			})
	}

	async requireSignIn() {
		return (await this.waitForAuthInit()) || (await this.signIn())
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

		if (this.defaultCampaign.id == campaignId) {
			return this.defaultCampaign
		}
		return this.campaigns.filter((campaign) => campaign.id == campaignId)[0]
	}

	async switchCampaignId(campaignId) {
		await this.switchCampaign(await this.campaignWithId(campaignId))
	}

	async switchCampaign(campaign) {
		await this.requireSignIn()

		if (this.currentCampaign?.id === campaign.id) {
			return
		}

		this.currentCampaign = campaign
		this.displayCurrentCampaignName()
		this.updateURLForCurrentCampaign()
		await this.getCharactersForCurrentCampaign()
	}

	displayCurrentCampaignName() {
		document.getElementById("current-campaign").innerText = this.currentCampaign.name
	}

	updateURLForCurrentCampaign() {
		setUrlHashWithoutHandling(`#view=${this.currentCampaign.id}`, "")
	}

	async renameCampaign(campaign, name) {
		await this.requireSignIn()
		await this.requireCampaigns()

		let rename = {
			name: name
		}
		await updateDoc(doc(db, campaignsCollection, campaign.id), rename)

		campaign.name = name
		this.sortCampaigns()
		this.displayCurrentCampaignName()
	}

	// MARK: Characters

	charactersForCurrentCampaignQuery() {
		return collection(db,
			campaignsCollection, this.currentCampaign.id,
			charactersCollection).withConverter(characterSheetConverter)
	}

	async getCharactersForCurrentCampaign() {
		await this.requireSignIn()
		await this.requireCurrentCampaign()

		this.unsubscribeCharactersForCurrentCampaign?.()

		const initialLoad = new Deferred()

		this.currentCharacterSheets = {}
		const q = this.charactersForCurrentCampaignQuery()
		this.unsubscribeCharactersForCurrentCampaign = onSnapshot(q, (snapshot) => {
			snapshot.docChanges().forEach((change) => {
				const sheet = change.doc.data()
				const source = change.doc.metadata.hasPendingWrites ? "Local" : "Server"
				switch (change.type) {
					case "added":
						console.debug(`New character from ${source}: `, sheet)
						this.addCurrentCharacterSheet(sheet)
						break
					case "modified":
						console.debug(`Modified character from ${source}: `, sheet)
						this.addCurrentCharacterSheet(sheet)
						break
					case "removed":
						console.debug(`Removed character from ${source}: `, sheet)
						delete this.currentCharacterSheets[sheet.id]
						break
				}
			})
			initialLoad.resolve()
		})
		await initialLoad.promise
	}

	async sortedCurrentCharacterSheets() {
		await this.requireCurrentCharacterSheets()

		let sheets = Object.values(this.currentCharacterSheets)
		sheets.sort((a, b) => a.name.localeCompare(b.name))
		return sheets
	}

	addCurrentCharacterSheet(sheet) {
		this.currentCharacterSheets[sheet.id] = sheet
	}

	async requireCurrentCharacterSheets() {
		if (this.currentCharacterSheets === null) {
			await this.getCharactersForCurrentCampaign()
		}
	}

	async currentCharacterSheetWithId(characterId) {
		await this.requireCurrentCharacterSheets()

		return this.currentCharacterSheets[characterId]
	}

	async uploadCharacter(json) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()
		await this.requireCurrentCharacterSheets()

		const sheet = new CharacterSheet(json)

		// Check if the sheet is unchanged
		if (this.currentCharacterSheets[sheet.id]?.jsonString == sheet.jsonString) {
			// No changes, no need to do anything.
			console.log("Skipping upload for unchanged character sheet", sheet.name)
			return
		}

		try {
			await setDoc(doc(db, campaignsCollection, this.currentCampaign.id, charactersCollection, sheet.id).withConverter(characterSheetConverter), sheet)
			await addDoc(collection(db, campaignsCollection, this.currentCampaign.id, charactersCollection, sheet.id, characterVersionsCollection).withConverter(characterSheetConverter), sheet)
			this.updateURLForCharacter(sheet)
			console.log("Character Sheet written with ID: ", sheet.id)
		} catch (error) {
			console.error("Error adding Character Sheet: ", error)
		}
	}

	updateURLForCharacter(characterSheet) {
		if (characterSheet) {
			setUrlHashWithoutHandling(`#view=${this.currentCampaign.id}.${characterSheet.id}`, characterSheet.name)
		} else {
			this.updateURLForCurrentCampaign()
		}
	}

	async versionsForCharacter(characterSheet) {
		// TODO: Caching of some sort, and pruning old versions, or maybe use TTL for that?
		const versionsRef = collection(db,
			campaignsCollection, this.currentCampaign.id,
			charactersCollection, characterSheet.id,
			characterVersionsCollection).withConverter(characterSheetConverter)
		const querySnapshot = await getDocs(query(versionsRef, orderBy("saved", "desc"), limit(6)))

		let versions = querySnapshot.docs.map((doc) => doc.data())
		versions.sort((a, b) => b.saved - a.saved)
		return versions
	}

}

export const cloud = new Cloud()