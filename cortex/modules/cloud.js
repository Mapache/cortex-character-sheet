import { app, analytics, auth, db } from "./firebase.js"
import { save_character } from "./save.js"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

async function require_sign_in() {
	if (auth.currentUser) {
		return
	}
	await sign_in()
}

async function sign_in() {
	const provider = new GoogleAuthProvider()
	signInWithPopup(auth, provider)
		.then((result) => {
			// This gives you a Google Access Token. You can use it to access the Google API.
			const credential = GoogleAuthProvider.credentialFromResult(result)
			const token = credential.accessToken
			// The signed-in user info.
			const user = result.user
			// IdP data available using getAdditionalUserInfo(result)
			// ...
		}).catch((error) => {
			// Handle Errors here.
			const errorCode = error.code
			const errorMessage = error.message
			// The email of the user's account used.
			const email = error.customData.email
			// The AuthCredential type that was used.
			const credential = GoogleAuthProvider.credentialFromError(error)
			// ...
			console.log("Sign-in error for ", error.customData.email, error.code, error.message)
		})
}

export class Campaign {}

export class CharacterSheet {
	constructor(json, campaignId, docId) {
		this.json = json
		this.name = json.characterName
		this.campaignId = campaignId
		this.docId = docId
	}

	doc() {
		return {
			json: JSON.stringify(this.json),
			name: this.name,
			campaignId: this.campaignId
		}
	}

}

export class Cloud {
	constructor(arg) {
		this.arg = arg
	}

	action() {

	}

}

export async function campaigns_menu() {
	await require_sign_in()

	//TODO
}

export async function characters_menu() {
	await require_sign_in()

	const querySnapshot = await getDocs(collection(db, "characters"));
	querySnapshot.forEach((doc) => {
		console.log(`${doc.id} => ${JSON.stringify(doc.data(), null, 2)}`)
	})
}

export async function upload_character(e) {
	await require_sign_in()

	let json = save_character()
	try {
		const docRef = await addDoc(collection(db, "characters"), new CharacterSheet(json, null, null).doc())
		console.log("Document written with ID: ", docRef.id)
	} catch (error) {
		console.error("Error adding document: ", error)
	}
}