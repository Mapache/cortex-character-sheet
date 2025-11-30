import { RGB } from "./color.js"
import { noDiePlaceholder } from "./conversion.js"
import { didModifyDisplayedCharacterSheet } from "./displayedCharacter.js"

function resetTraitGroup(traitGroup) {
	if (dataStyleRequiresTraitModification(traitGroup)) {
		for (let trait of traitGroup.querySelectorAll(".trait")) {
			removeTraitGroupStyleFromTrait(traitGroup, trait)
		}
	}

	traitGroup.classList.remove("detailed")

	traitGroup.classList.remove("abilities")
	traitGroup.classList.remove("compact")
	traitGroup.classList.remove("inline")
	traitGroup.classList.remove("milestones")
	traitGroup.classList.remove("resources")
	traitGroup.classList.remove("roles")
	traitGroup.classList.remove("signature-asset")
	traitGroup.classList.remove("stress")
	traitGroup.classList.remove("two-column")
	traitGroup.classList.remove("values")

	traitGroup.removeAttribute("data-style")
}

export function applyDataStyle(traitGroup, style) {
	resetTraitGroup(traitGroup)
	if (style) {
		traitGroup.setAttribute("data-style", style)
		const styles = style.split(" ")
		traitGroup.classList.add(...styles)

		if (dataStyleRequiresTraitModification(traitGroup)) {
			for (const trait of traitGroup.querySelectorAll(".trait")) {
				applyTraitGroupStyleToTrait(traitGroup, trait)
			}
		}
	}
}

function dataStyleRequiresTraitModification(traitGroup) {
	return traitGroup.classList.contains("stress")
}

export function applyTraitGroupStyleToTrait(traitGroup, trait, applyDefaultValue) {
	if (traitGroup.classList.contains("stress")) {
		let track = document.createElement("div")
		track.classList.add("track")
		track.innerHTML = "<d>4</d> <d>6</d> <d>8</d> <d>0</d> <d>2</d>"
		trait.querySelector(".trait-value").after(track)
		const clearValue = noDiePlaceholder
		if (applyDefaultValue) {
			setTrackValue(trait, clearValue) // Default to stress tracks being clear instead of d6 like other traits
		} else {
			updateTrackDisplayedValue(trait)
		}
		track.addEventListener("click", (e) => {
			if (e.target.nodeName === "D") {
				// Clicking the current value clears the stress track
				let d = e.target
				let value = d.classList.contains("current") ? clearValue : d.innerText
				setTrackValue(trait, value)
				didModifyDisplayedCharacterSheet()
			}
		})
	}
}

function setTrackValue(trait, value) {
	if (value !== noDiePlaceholder) {
		value = `<d>${value}</d>`
	}
	trait.querySelector(".trait-value").innerHTML = value
	updateTrackDisplayedValue(trait)
}

function updateTrackDisplayedValue(trait) {
	const value = trait.querySelector(".trait-value d")?.innerText ?? noDiePlaceholder
	let nonmatchingState = (value === noDiePlaceholder) ? "empty" : "full"
	for (let die of trait.querySelector(".track").querySelectorAll("d")) {
		die.classList.remove("full")
		die.classList.remove("current")
		die.classList.remove("empty")
		if (die.innerText === value) {
			die.classList.add("current")
			nonmatchingState = "empty"
		} else {
			die.classList.add(nonmatchingState)
		}
	}
}

// Called after programmatically setting the value of traits in a group, such as during loading.
export function updateTraitGroupDisplay(traitGroup) {
	if (traitGroup.classList.contains("stress")) {
		for (let trait of traitGroup.querySelectorAll(".trait")) {
			updateTrackDisplayedValue(trait)
		}
	}
}

export function removeTraitGroupStyleFromTrait(traitGroup, trait) {
	if (traitGroup.classList.contains("stress")) {
		trait.querySelector(".track").remove()
	}
}

export function applyHighlightColor(elem, color) {
	if (color) {
		elem.setAttribute("highlight-color", color)
		elem.style.setProperty("--highlight", color)
		elem.style.setProperty("--aura", color + "20") // RGB + A
		let hsv = RGB.fromHex(color).toHSV()
		hsv.v = 1 - hsv.v
		let darkColor = hsv.toRGB().toHex()
		elem.style.setProperty("--darklight", darkColor)
		elem.style.setProperty("--umbra", darkColor + "20") // RGB + A
	} else {
		elem.removeAttribute("highlight-color")
		elem.style.removeProperty("--highlight")
		elem.style.removeProperty("--aura")
		elem.style.removeProperty("--darklight")
		elem.style.removeProperty("--umbra")
	}
}

export const defaultHighlightColor = "#C50852"

export const globalHighlightColorPicker = (() => {
	let picker = document.createElement("input")
	picker.id = "global-highlight-picker"
	picker.title = "Highlight Color"
	picker.type = "color"
	picker.value = defaultHighlightColor

	function setGlobalHighlightColor(e) {
		const root = document.querySelector(":root")
		applyHighlightColor(root, picker.value)
	}
	picker.onchange = setGlobalHighlightColor
	picker.oninput = setGlobalHighlightColor

	return picker
})()

export function inferTraitGroupStyle(e) {
	const header = e.target
	const traitGroup = header.parentElement
	if (traitGroup.getAttribute("data-style") != null) {
		return
	}

	resetTraitGroup(traitGroup)

	switch (header.innerText.toLowerCase()) {
		case "values":
		case "emotions":
		case "roles":
		case "skills":
		case "specialties":
			applyDataStyle(traitGroup, "values")
			break
		case "asset":
		case "assets":
		case "signature asset":
		case "signature assets":
			applyDataStyle(traitGroup, "signature-asset")
			break
		case "milestones":
			applyDataStyle(traitGroup, "milestones")
			break
		case "resource":
		case "resources":
			applyDataStyle(traitGroup, "resources")
			break
		case "stress":
		case "complication":
		case "complications":
			applyDataStyle(traitGroup, "stress")
			break
	}
}