import { app, analytics, auth, db } from "./firebase.js"
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { doc, collection, where, query, orderBy, startAfter, limit, onSnapshot, addDoc, setDoc, updateDoc, getDoc, getDocs, documentId, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

import { Deferred } from "./defer.js"
import { currentCharacterName } from "./elements.js"
import { load_character } from "./load.js"
import { characterName, save_character } from "./save.js"
import { merge } from "./merge.js"
import { ARC4 } from "./random.js"
import { setUrlHashWithoutHandling } from "./urlHashHandler.js"
import { noDiePlaceholder } from "./conversion.js"


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

	static defaultName = "Default"

	static converter = {
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

	static converter = {
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
}

// Wrapper for a converter that adds an expiration date for TTL purposes.
function expiring(converter) {
	return {
		toFirestore: (model) => {
			let data = converter.toFirestore(model)
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 30) // 30 days in the future
			data.expiration = futureDate
			return data
		},
		fromFirestore: converter.fromFirestore
	}
}

export class Message {
	/**
	 * @param {string} author (UserId)
	 * @param {string} characterName
	 * @param {string} text
	 * @param {[DieRoll]} dice
	 * @param {[DieStatus]} diceStatus: Separate from dice so it's mutable after rolling
	 * @param {Timestamp} saved
	 * @param {id} id
	 */
	constructor(author, characterName, text, dice, diceStatus, saved, id) {
		this.author = author
		this.characterName = characterName
		this.text = text
		this.dice = dice ?? []
		this.diceStatus = diceStatus ?? []
		this.saved = saved
		this.id = id
	}

	static DieRoll = class {
		/**
		 * @param {string} label (UserId)
		 * @param {number} size
		 * @param {number} result
		 */
		constructor(label, size, result) {
			this.label = label
			this.size = size
			this.result = result
		}

		static unchosen = 0
		static total = 1
		static effect = 2
	}

	addDie(label, size) {
		if (this.saved) {
			console.error("Attempting to add dice to saved roll", this)
			return
		}
		this.dice.push(new Message.DieRoll(label, size))
		this.diceStatus.push(Message.DieRoll.unchosen)
	}

	diceStatusSuggestions(totalDiceCount = 2, effectDiceCount = 1) {
		const dice = Array.from(this.dice.entries()) // [[index, roll]]
		// Drop hitches (1)
		const validDice = dice.filter(([index, roll]) => roll.result > 1)
		// Sort by decreasing result, with increasing size as tiebreaker
		const diceByTotal = validDice.toSorted(
			([indexA, rollA], [indexB, rollB]) =>
				(rollB.result - rollA.result) * 100 + (rollA.size - rollB.size))
		// Sort by decreasing size, with increasing result as tiebreaker
		const diceByEffect = validDice.toSorted(
			([indexA, rollA], [indexB, rollB]) =>
				(rollB.size - rollA.size) * 100 + (rollA.result - rollB.result))

		function choose(diceStatus, count, sortedDice, status) {
			if (count <= 0) {
				return
			}
			let chosen = 0
			for (const [index, roll] of sortedDice) {
				if (diceStatus[index] === Message.DieRoll.unchosen) {
					diceStatus[index] = status
					if (++chosen === count) {
						break
					}
				}
			}
		}

		if (0) {
			console.debug(dice.map(([index, roll]) => `${roll.result}/${roll.size}`))
			console.debug(validDice.map(([index, roll]) => `${roll.result}/${roll.size}`))
			console.debug(diceByTotal.map(([index, roll]) => `${roll.result}/${roll.size}`))
			console.debug(diceByEffect.map(([index, roll]) => `${roll.result}/${roll.size}`))
		}

		// Try possibilities from prioritizing highest total to prioritizing highest effect
		let diceStatusSuggestions = []
		for (let totalPriority = totalDiceCount; totalPriority >= 0; --totalPriority) {
			const diceStatus = new Array(dice.length).fill(Message.DieRoll.unchosen)
			choose(diceStatus, totalPriority, diceByTotal, Message.DieRoll.total)
			choose(diceStatus, Math.min(effectDiceCount, validDice.length - totalDiceCount), diceByEffect, Message.DieRoll.effect)
			choose(diceStatus, totalDiceCount - totalPriority, diceByTotal, Message.DieRoll.total)
			if (JSON.stringify(diceStatus) !== JSON.stringify(diceStatusSuggestions.at(-1))) {
				diceStatusSuggestions.push(diceStatus)
			}
		}

		return diceStatusSuggestions
	}

	diceForStatus(diceStatus) {
		const totalDice = []
		const effectDice = []
		for (const [index, status] of diceStatus.entries()) {
			switch (status) {
				case Message.DieRoll.total:
					totalDice.push(this.dice[index])
					break
				case Message.DieRoll.effect:
					effectDice.push(this.dice[index])
					break
			}
		}
		if (totalDice.length === 0) {
			totalDice.push(new Message.DieRoll("None", noDiePlaceholder, 0))
		}
		if (effectDice.length === 0) {
			effectDice.push(new Message.DieRoll("Default", 4, noDiePlaceholder))
		}
		return [totalDice, effectDice]
	}

	static converter = {
		toFirestore: (message) => {
			let unrolledDice = []
			for (const dieRoll of message.dice) {
				unrolledDice.push(dieRoll.label)
				unrolledDice.push(dieRoll.size)
			}
			return {
				author: message.author,
				characterName: message.characterName,
				text: message.text,
				dice: unrolledDice,
				diceStatus: message.diceStatus,
				saved: serverTimestamp(),
			}
		},
		fromFirestore: (snapshot, options) => {
			const data = snapshot.data(options)
			// Use the time the message was saved as the pseudorandom seed for the dice results.
			const generator = data.saved ? ARC4.seed(data.saved.nanoseconds) : null
			let rolledDice = []
			for (let i = 0; i < data.dice.length; i += 2) {
				const label = data.dice[i]
				const size = data.dice[i + 1]
				const result = generator?.die(size)
				rolledDice.push(new Message.DieRoll(label, size, result))
			}
			return new Message(
				data.author,
				data.characterName,
				data.text,
				rolledDice,
				data.diceStatus,
				data.saved?.toDate(),
				snapshot.id)
		}
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
			if (value === access) {
				return key
			}
		}
		return null
	}

	// Access Levels
	static unauthorized = 0
	static reader = 1
	static editor = 2
	static admin = 3

	static generate() {
		function generateKey(access) {
			// First digit encodes access level, then UUID with extraneous hyphens stripped.
			//
			// Note that the first digit is descriptive, not prescriptive; the client uses it to 
			// know what the intended access for a permission key is without having to query the server, 
			// but actual access control only depends on the server-side permissions map value, which
			// can only be read by users who already have admin access to that permissions document.
			return access + crypto.randomUUID().replace(/-/g, "")
		}
		let permissions = {}
		permissions[generateKey(CampaignPermissions.reader)] = CampaignPermissions.reader
		permissions[generateKey(CampaignPermissions.editor)] = CampaignPermissions.editor
		permissions[generateKey(CampaignPermissions.admin)] = CampaignPermissions.admin
		return new CampaignPermissions(permissions)
	}

	static converter = {
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
}

export class UserPermissions {
	// campaigns maps from Campaign ids to CampaignPermissions UUID access keys
	constructor(campaigns) {
		this.campaigns = campaigns
	}

	static converter = {
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
}

// MARK: Cloud

const collections = {
	campaigns: "campaigns",
	characters: "characters",
	characterVersions: "versions",
	messages: "messages",
	campaignPermissions: "campaignPermissions",
	userPermissions: "userPermissions",
	userProfiles: "userProfiles",
}

export class Cloud {
	constructor() {
		this.userPermissions = null
		this.currentCampaign = null
		this.defaultCampaign = null
		this.campaigns = null
		this.currentCharacterSheets = null

		this.displayNameCache = {}
	}

	// MARK: Authentication

	async waitForAuthInit() {
		return new Promise((resolve) => {
			const unsubscribe = onAuthStateChanged(auth, (user) => {
				unsubscribe() // Unsubscribe after the first state change
				resolve(user) // Resolve with the initial user state
				this.updateProfile(user)
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
				this.updateProfile(user)
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

	// MARK: Profiles

	async updateProfile(user) {
		if (!user) {
			return
		}
		await setDoc(doc(db, collections.userProfiles, user.uid), {
			displayName: user.displayName
		})
	}

	async displayNameForUserId(uid) {
		const cachedDisplayName = this.displayNameCache[uid]
		if (cachedDisplayName) {
			return cachedDisplayName
		}
		const docSnapshot = await getDoc(doc(db, collections.userProfiles, uid))
		const displayName = docSnapshot.exists() ? docSnapshot.data().displayName : uid
		this.displayNameCache[uid] = displayName
		return displayName
	}

	// MARK: Permissions

	async getUserPermissions() {
		const user = await this.requireSignIn()

		const docSnapshot = await getDoc(doc(db, collections.userPermissions, user.uid).withConverter(UserPermissions.converter))
		if (docSnapshot.exists()) {
			this.userPermissions = docSnapshot.data()
		} else {
			this.userPermissions = new UserPermissions({})
			await setDoc(doc(db, collections.userPermissions, user.uid).withConverter(UserPermissions.converter), this.userPermissions)
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
			return CampaignPermissions.unauthorized
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
		await updateDoc(doc(db, collections.userPermissions, user.uid), permission)
	}

	async accessKey(campaign, access) {
		const user = await this.requireSignIn()
		const campaignId = campaign.id
		try {
			const docSnapshot = await getDoc(doc(db, collections.campaignPermissions, campaignId).withConverter(CampaignPermissions.converter))
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
			if (campaign.id === user.uid) {
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

		this.defaultCampaign = await this.createNewCampaignWithId(Campaign.defaultName, user.uid)
	}

	async getCampaigns() {
		const user = await this.requireSignIn()
		await this.requireUserPermissions()

		const campaignIds = Object.keys(this.userPermissions.campaigns)
		if (campaignIds.length > 0) {
			const q = query(
				collection(db, collections.campaigns).withConverter(Campaign.converter),
				where(documentId(), "in", campaignIds))
			const querySnapshot = await getDocs(q)

			this.campaigns = querySnapshot.docs.map((doc) => doc.data())
			this.sortCampaigns()
		} else {
			this.campaigns = []
		}

		if (this.findDefaultCampaign(user) === null) {
			await this.createDefaultCampaign()
		}

		if (this.currentCampaign === null) {
			await this.switchCampaign(this.defaultCampaign)
		}

		if (0) {
			console.debug("user.uid = ", user.uid)
			console.debug("this.userPermissions = ", this.userPermissions)
			console.debug("this.defaultCampaign = ", this.defaultCampaign)
			console.debug("this.campaigns = ", this.campaigns)
			console.debug("this.currentCampaign = ", this.currentCampaign)
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

		const campaignId = doc(collection(db, collections.campaigns)).id
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
			await this.updateAccessKey(campaignId, permissions.keyFor(CampaignPermissions.admin))
			await setDoc(doc(db, collections.campaignPermissions, campaignId).withConverter(CampaignPermissions.converter), permissions)
			await setDoc(doc(db, collections.campaigns, campaignId).withConverter(Campaign.converter), campaign)
			console.debug(`Campaign ${name} written with ID ${campaignId} `)
			return campaign
		} catch (error) {
			console.error(`Error adding Campaign ${name}: `, error)
		}
	}

	async campaignWithId(campaignId) {
		await this.requireSignIn()
		await this.requireCampaigns()

		if (this.defaultCampaign.id === campaignId) {
			return this.defaultCampaign
		}
		return this.campaigns.filter((campaign) => campaign.id === campaignId)[0]
	}

	async switchCampaignId(campaignId) {
		const campaign = await this.campaignWithId(campaignId)
		if (!campaign) {
			console.error(`Attempting to load nonexistent campaign with id ${campaignId}!`)
			return
		}
		await this.switchCampaign(campaign)
	}

	async switchCampaign(campaign) {
		await this.requireSignIn()

		if (!campaign) {
			console.error("Attempting to load nonexistent campaign!")
			return
		}

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
		await updateDoc(doc(db, collections.campaigns, campaign.id), rename)

		campaign.name = name
		this.sortCampaigns()
		this.displayCurrentCampaignName()
	}

	// MARK: Characters

	charactersForCurrentCampaignQuery() {
		return collection(db,
			collections.campaigns, this.currentCampaign.id,
			collections.characters).withConverter(CharacterSheet.converter)
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
						if (change.doc.metadata.hasPendingWrites || sheet.name !== characterName()) {
							// The change is either local or for a different character, so just update normally.
							this.addCurrentCharacterSheet(sheet)
							break
						}
						// The change is to the currently displayed character, so attempt to merge it.
						console.debug(`Change is to displayed character, checking for merge…`)
						const mergeSheets = () => {
							const currentJson = save_character()
							const currentSheet = new CharacterSheet(currentJson)
							if (currentSheet.jsonString === sheet.jsonString) {
								// New sheet matches what is displayed. This is likely the server version of recent local save.
								console.debug("No changes to character sheet, skipping merge.")
								this.addCurrentCharacterSheet(sheet)
								return
							}
							const mergedJson = merge(
								this.currentCharacterSheets[sheet.id]?.json,
								currentJson,
								sheet.json)
							const mergedSheet = new CharacterSheet(mergedJson)
							if (mergedSheet.jsonString !== currentSheet.jsonString) {
								console.debug("Merge complete with result", mergedJson)
								load_character(mergedJson)
							}
							// Update the local copy to the last saved version.
							this.addCurrentCharacterSheet(sheet)
						}
						const currentlyEditing = document.activeElement.isContentEditable
						if (currentlyEditing) {
							console.debug(`Waiting for edits to complete…`)
							// Wait until edit is done, then merge.
							document.addEventListener("focusout", mergeSheets, { once: true })
						} else {
							mergeSheets()
						}
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
		if (this.currentCharacterSheets[sheet.id]?.jsonString === sheet.jsonString) {
			// No changes, no need to do anything.
			console.debug("Skipping upload for unchanged character sheet", sheet.name)
			return
		}

		try {
			await setDoc(doc(db,
				collections.campaigns, this.currentCampaign.id,
				collections.characters, sheet.id).withConverter(CharacterSheet.converter),
				sheet)
			await addDoc(collection(db,
				collections.campaigns, this.currentCampaign.id,
				collections.characters, sheet.id,
				collections.characterVersions).withConverter(expiring(CharacterSheet.converter)),
				sheet)
			this.updateURLForCharacter(sheet)
			console.debug("Character Sheet written with ID: ", sheet.id)
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
			collections.campaigns, this.currentCampaign.id,
			collections.characters, characterSheet.id,
			collections.characterVersions).withConverter(CharacterSheet.converter)
		const querySnapshot = await getDocs(query(versionsRef, orderBy("saved", "desc"), limit(6)))

		let versions = querySnapshot.docs.map((doc) => doc.data())
		versions.sort((a, b) => b.saved - a.saved)
		return versions
	}

	// MARK: Messages & Dice Rolls

	/**
	 * @param {string} text
	 * @param {[[label, size]]} dice
	 */
	async postMessageComponents(text, dice) {
		const user = await cloud.requireSignIn()
		const message = new Message(user.uid, currentCharacterName(), text)
		for (const die of dice) {
			message.addDie(...die)
		}
		await this.postMessage(message)
	}

	async postMessage(message) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()

		try {
			const docRef = await addDoc(collection(db,
				collections.campaigns, this.currentCampaign.id,
				collections.messages).withConverter(Message.converter),
				message)
			console.debug("Message written with ID: ", docRef.id)
		} catch (error) {
			console.error("Error adding Message: ", error)
		}
	}

	async updateMessage(messageId, update) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()
		console.debug(update)
		try {
			await updateDoc(doc(db,
				collections.campaigns, this.currentCampaign.id,
				collections.messages, messageId),
				update)
		} catch (error) {
			console.error("Error updating Message: ", error)
		}
	}

	async updateMessageText(messageId, text) {
		await this.updateMessage(messageId, { text: text })
	}

	async updateMessageDiceStatus(messageId, diceStatus) {
		await this.updateMessage(messageId, { diceStatus: diceStatus })
	}

	async fetchOlderMessages(endingTimestamp) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()

		const messagesRef = collection(db,
			collections.campaigns, this.currentCampaign.id,
			collections.messages).withConverter(Message.converter)
		const queryRef = endingTimestamp
			? query(messagesRef, orderBy("saved", "desc"), startAfter(endingTimestamp), limit(25))
			: query(messagesRef, orderBy("saved", "desc"), limit(25))
		const querySnapshot = await getDocs(queryRef)

		let messages = querySnapshot.docs.map((doc) => doc.data())
		// The query needs to be descending to fetch newest messages, but order the returned messsages in ascending order.
		messages.sort((a, b) => a.saved - b.saved)
		return messages
	}

	async subscribeToNewerMessages(messagesHandler, startingTimestamp) {
		await this.requireSignIn()
		await this.requireCurrentCampaign()

		this.unsubscribeMessagesForCurrentCampaign?.()

		const initialLoad = new Deferred()

		const messagesRef = collection(db,
			collections.campaigns, this.currentCampaign.id,
			collections.messages).withConverter(Message.converter)
		const queryRef = startingTimestamp
			? query(messagesRef, orderBy("saved"), startAfter(startingTimestamp))
			: query(messagesRef, orderBy("saved"))
		this.unsubscribeMessagesForCurrentCampaign = onSnapshot(queryRef, (snapshot) => {
			snapshot.docChanges().forEach((change) => {
				const message = change.doc.data()
				const source = change.doc.metadata.hasPendingWrites ? "Local" : "Server"
				switch (change.type) {
					case "added":
					case "modified":
						// TODO: Avoid double update from local and server changes.
						messagesHandler.showMessage(message)
						break
					case "removed":
						console.debug(`Removed message ${source}: `, message)
						// TODO: Handle message deletion; low-priority as only admins can delete messages entirely.
						break
				}
			})
			initialLoad.resolve()
		})
		await initialLoad.promise
	}

}

export const cloud = new Cloud()