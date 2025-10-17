function reset_trait_group(traitGroup) {
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
	reset_trait_group(traitGroup)
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

export function apply_trait_group_style_to_trait(traitGroup, trait) {
	if (traitGroup.classList.contains("stress")) {
		let track = document.createElement("div")
		track.classList.add("track")
		track.innerHTML = "4 6 8 0 2"
		trait.querySelector(".trait-value>c").after(track)
	}
}

export function remove_trait_group_style_from_trait(traitGroup, trait) {
	if (traitGroup.classList.contains("stress")) {
		trait.querySelector(".track").remove()
	}
}

export function apply_highlight_color(elem, color) {
	if (color == null) {
		elem.removeAttribute("highlight-color")
		elem.style.removeProperty("--highlight")
	} else {
		elem.setAttribute("highlight-color", color)
		elem.style.setProperty("--highlight", color)
		elem.style.setProperty("--aura", color + "20") // RGB + A
	}
}

export const defaultHighlightColor = "#C50852"

export function set_trait_group_name(e) {
	const traitGroup = e.target.parentElement
	if (traitGroup.getAttribute("data-style") != null) {
		return
	}

	reset_trait_group(e.target.parentElement)

	const title = e.target.innerText.toLowerCase()

	if (title == "roles") {
		apply_data_style(traitGroup, "values")
	}
	else if (title == "signature asset" || title == "signature assets") {
		apply_data_style(traitGroup, "signature-asset")
	}
	else if (title == "milestones") {
		apply_data_style(traitGroup, "milestones")
	}
	else if (title == "values") {
		apply_data_style(traitGroup, "values")
	}
	else if (title == "emotions") {
		apply_data_style(traitGroup, "values")
	}
	else if (title == "skills") {
		apply_data_style(traitGroup, "values")
	}
	else if (title == "specialties") {
		apply_data_style(traitGroup, "values")
	}
	else if (title == "resource" || title == "resources") {
		apply_data_style(traitGroup, "resources")
	}
	else if (title == "stress") {
		apply_data_style(traitGroup, "stress")
	}
}