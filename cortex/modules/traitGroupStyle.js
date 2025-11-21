import { noDiePlaceholder } from "./conversion.js"

function resetTraitGroup(traitGroup) {
	if (data_style_requires_trait_modification(traitGroup)) {
		for (let trait of traitGroup.querySelectorAll(".trait")) {
			remove_trait_group_style_from_trait(traitGroup, trait)
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

export function apply_data_style(traitGroup, style) {
	resetTraitGroup(traitGroup)
	if (style != null) {
		traitGroup.setAttribute("data-style", style)
		for (let sub_style of style.split(" ")) {
			traitGroup.classList.add(sub_style)
		}

		if (data_style_requires_trait_modification(traitGroup)) {
			for (let trait of traitGroup.querySelectorAll(".trait")) {
				apply_trait_group_style_to_trait(traitGroup, trait)
			}
		}
	}
}

function data_style_requires_trait_modification(traitGroup) {
	return traitGroup.classList.contains("stress")
}

export function apply_trait_group_style_to_trait(traitGroup, trait, applyDefaultValue) {
	if (traitGroup.classList.contains("stress")) {
		let track = document.createElement("div")
		track.classList.add("track")
		track.innerHTML = "<d>4</d> <d>6</d> <d>8</d> <d>0</d> <d>2</d>"
		trait.querySelector(".trait-value").after(track)
		const clearValue = noDiePlaceholder
		if (applyDefaultValue) {
			set_track_value(trait, clearValue) // Default to stress tracks being clear instead of d6 like other traits
		} else {
			update_track_displayed_value(trait)
		}
		track.addEventListener("click", (e) => {
			if (e.target.nodeName === "D") {
				// Clicking the current value clears the stress track
				let d = e.target
				let value = d.classList.contains("current") ? clearValue : d.innerText
				set_track_value(trait, value)
			}
		})
	}
}

function set_track_value(trait, value) {
	if (value !== noDiePlaceholder) {
		value = `<d>${value}</d>`
	}
	trait.querySelector(".trait-value").innerHTML = value
	update_track_displayed_value(trait)
}

function update_track_displayed_value(trait) {
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
export function update_trait_group_display(traitGroup) {
	if (traitGroup.classList.contains("stress")) {
		for (let trait of traitGroup.querySelectorAll(".trait")) {
			update_track_displayed_value(trait)
		}
	}
}

export function remove_trait_group_style_from_trait(traitGroup, trait) {
	if (traitGroup.classList.contains("stress")) {
		trait.querySelector(".track").remove()
	}
}

export function apply_highlight_color(elem, color) {
	if (color) {
		elem.setAttribute("highlight-color", color)
		elem.style.setProperty("--highlight", color)
		elem.style.setProperty("--aura", color + "20") // RGB + A
	} else {
		elem.removeAttribute("highlight-color")
		elem.style.removeProperty("--highlight")
		elem.style.removeProperty("--aura")
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
		apply_highlight_color(root, picker.value)
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
			apply_data_style(traitGroup, "values")
			break
		case "asset":
		case "assets":
		case "signature asset":
		case "signature assets":
			apply_data_style(traitGroup, "signature-asset")
			break
		case "milestones":
			apply_data_style(traitGroup, "milestones")
			break
		case "resource":
		case "resources":
			apply_data_style(traitGroup, "resources")
			break
		case "stress":
		case "complication":
		case "complications":
			apply_data_style(traitGroup, "stress")
			break
	}
}