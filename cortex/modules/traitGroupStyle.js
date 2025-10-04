function reset_trait_group(elem) {
	elem.classList.remove("detailed")

	elem.classList.remove("abilities")
	elem.classList.remove("compact")
	elem.classList.remove("inline")
	elem.classList.remove("milestones")
	elem.classList.remove("resources")
	elem.classList.remove("roles")
	elem.classList.remove("signature-asset")
	elem.classList.remove("stress")
	elem.classList.remove("two-column")
	elem.classList.remove("values")

	elem.removeAttribute("data-style")
}

export function apply_data_style(elem, style) {
  reset_trait_group(elem)
  if (style != null) {
    elem.setAttribute("data-style", style)
    for (let sub_style of style.split(" ")) {
      elem.classList.add(sub_style)
    }
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