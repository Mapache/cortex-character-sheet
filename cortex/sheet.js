function text_to_html(html) {
	if (html.search(/^-/m) != -1) {
		html = html.replace(/^-(.*)$/m, '<ul><li>$1</li>')
		html = html.replace(/^-(.*)$/gm, '<li>$1</li>')
		index = html.lastIndexOf("</li>") + 5
		html = html.substring(0, index) + "</ul>" + html.substring(index)
	}

	html = html.replace(/\bd4\b/g, '<c>4</c>')
	html = html.replace(/\bd6\b/g, '<c>6</c>')
	html = html.replace(/\bd8\b/g, '<c>8</c>')
	html = html.replace(/\bd10\b/g, '<c>0</c>')
	html = html.replace(/\bd12\b/g, '<c>2</c>')
	html = html.replace(/\bPP\b/g, '<pp></pp>')
	html = html.replace(/\bMOTE\b/ig, '<mote></mote>')
	html = html.replace(/\n/g, '<br>')
	html = html.replace(/\<\/li\>\<br\>/g, '</li>')
	html = html.replace(/\<\/li\>\<br\>/g, '</li>')
	html = html.replace(/\<\/ul\>\<br\>/g, '</ul>')
	html = html.replace(/&nbsp;/g, ' ')
	html = html.replace(/\[([^\[\]]*)]/g, '<ref>$1</ref>')

	return html
}
function html_to_text(text) {
	text = text.replace(/<c>4<\/c>/g, 'd4')
	text = text.replace(/<c>6<\/c>/g, 'd6')
	text = text.replace(/<c>8<\/c>/g, 'd8')
	text = text.replace(/<c>0<\/c>/g, 'd10')
	text = text.replace(/<c>2<\/c>/g, 'd12')
	text = text.replace(/<pp><\/pp>/g, 'PP')
	text = text.replace(/<mote><\/mote>/g, 'mote')
	text = text.replace(/<br>/g, '\n')
	text = text.replace(/<ul>/g, '')
	text = text.replace(/<\/ul>/g, '')
	text = text.replace(/<li>/g, '- ')
	text = text.replace(/<\/li>/g, '\n')
	text = text.replace(/&nbsp;/g, ' ')
	text = text.replace(/<ref>([^<]*)<\/ref>/g, '[$1]')

	return text
}

function add_event_handlers(editable) {
	editable.addEventListener("blur", function (event) {
		event.target.innerHTML = text_to_html(event.target.innerText)
	})
	editable.addEventListener("focus", function (event) {
		event.target.innerText = html_to_text(event.target.innerHTML)
	})

	if (editable.classList.contains("header")) {
		editable.addEventListener("keydown", function (event) {
			if (event.key != 'Enter') return;

			event.preventDefault();
			event.target.blur();
		})
	}
}
function init_event_handlers(parent) {
	var editables = parent.querySelectorAll('div[contenteditable]')
	for (var e = 0; e < editables.length; e++) {
		var editable = editables[e]
		add_event_handlers(editable)
	}
}

function get_parent_with_class(element, c) {
	if (element === null) {
		return null;
	}

	if (element.classList.contains(c)) {
		return element;
	}

	return get_parent_with_class(element.parentElement, c)
}

function save_character(e) {
	var file = {}
	var data = {}
	file.version = 3;
	inputs = document.querySelectorAll('input, textarea, img, div[contenteditable], h2[contenteditable], c[contenteditable], span[contenteditable]')
	for (var i = 0; i < inputs.length; i++) {
		var input = inputs[i]
		if (input.classList.contains('non-serialized') || input.classList.contains('no-print') || input.classList.contains('template')) {
			continue;
		}
		var non_serialized_parent = get_parent_with_class(input.parentElement, "non-serialized") || get_parent_with_class(input.parentElement, "no-print") || get_parent_with_class(input.parentElement, "template")
		if (non_serialized_parent) {
			continue;
		}

		id = input.id
		var spell_parent = get_parent_with_class(input.parentElement, "spell")
		if (spell_parent && spell_parent.classList.contains("template")) {
			continue
		}
		if (spell_parent !== null) {
			id = path_to(input.parentElement, "spells") + "/" + input.id
		}
		else if (input.parentElement.id == "talent" || input.parentElement.id == "weapon" || input.parentElement.id == "ability" || input.parentElement.id == "critical-injury") {
			id = input.parentElement.parentElement.id + "/" + Array.prototype.indexOf.call(input.parentElement.parentElement.children, input.parentElement) + "/" + input.id
		}
		if (input.id === '') {
			id = get_path_from_element(input)
		}

		if (input.getAttribute("type") == "checkbox") {
			data[id] = input.checked
		}
		else if (input.tagName == "IMG") {
			data[id] = input.src
		}
		else if (input.tagName == "DIV" || input.tagName == "H2" || input.tagName == "C" || input.tagName == "SPAN") {
			let contents = input.innerHTML
			if (contents != "Trait description.") { // Don't save default trait descriptions.
				data[id] = html_to_text(contents)
			}
		}
		else {
			data[id] = input.value
		}
		if (input.getAttribute("data-x") !== null) {
			data[id] = { value: data[id] }
			data[id].x = input.getAttribute("data-x")
			data[id].y = input.getAttribute("data-y")
			data[id].zoom = input.getAttribute("data-zoom")
		}
		if (input.getAttribute("data-style") !== null) {
			data[id] = { value: data[id] }
			data[id].style = input.getAttribute("data-style")
		}
	}
	file.data = data;

	let styles = {}
	let styledDivs = document.querySelectorAll("div[data-style]")
	for (let elem of styledDivs) {
		styles[get_path_from_element(elem)] = elem.getAttribute("data-style")
	}
	if (Object.keys(styles).length) {
		file.styles = styles
	}

	let classList = {}
	let customizedDivs = document.querySelectorAll("div[custom-classes]")
	for (let elem of customizedDivs) {
		classList[get_path_from_element(elem)] = elem.getAttribute("custom-classes")
	}
	if (Object.keys(classList).length) {
		file.classList = classList
	}

	let highlightColors = {}
	highlightColors[":root"] = document.querySelector(":root").getAttribute("highlight-color")
	let highlightedDivs = document.querySelectorAll("div[highlight-color]")
	for (let elem of highlightedDivs) {
		highlightColors[get_path_from_element(elem)] = elem.getAttribute("highlight-color")
	}
	if (Object.keys(highlightColors).length) {
		file.highlightColors = highlightColors
	}

	let uri = encodeURI("data:application/json;charset=utf-8," + JSON.stringify(file))
	uri = uri.replace(/#/g, "%23")
	let link = document.createElement("a")
	link.setAttribute("href", uri)
	let characterName = document.getElementById("character-name").innerText
	if (characterName == "") characterName = "unnamed"
	link.setAttribute("download", characterName + ".json")
	document.body.appendChild(link) // Required for FF
	link.click()
	link.remove()
}

function get_path_from_element(elem) {
	let id = elem.id
	let path = ""
	while (id === "" && elem.parentElement != null) {
		id = elem.parentElement.id
		path = "/" + Array.prototype.indexOf.call(elem.parentElement.children, elem) + path
		elem = elem.parentElement
	}
	if (elem.parentElement == null) {
		id = ":root"
	}
	return id + path
}

function get_element_from_path(path) {
	let parts = path.split("/")
	let current = (parts[0] == ":root") ? document.querySelector(":root") : document.querySelector("div#" + parts[0])
	for (var p = 1; p < parts.length; p++) {
		try {
			current = current.querySelector("#" + parts[p])
		} catch {
			current = current.children[parts[p]]
		}
		if (current == null) {
			console.log("Failed to find: " + path)
		}
		if (current.getAttribute("data-onload") !== null) {
			// console.log("Creating new element")
			window[current.getAttribute("data-onload")]({ target: current })
			p = p - 1
			current = current.parentElement
		}
	}
	// console.log(current)
	return current
}

function load_character(file) {
	var version = file.version
	//console.log(version)

	var data = file
	if (version >= 2) {
		data = file.data
	}

	for (var i in data) {
		var element = null
		var value = (typeof (data[i]) == 'object') ? data[i].value : data[i]
		if (!i.includes('/')) {
			element = document.getElementById(i)
		}
		else {
			element = get_element_from_path(i)
		}

		if (element == null) continue;
		//		console.log(element);

		if (element.getAttribute("type") == "checkbox") {
			element.checked = value
		}
		else if (element.tagName == "IMG") {
			element.src = value
		}
		else if (element.tagName == "DIV" || element.tagName == "H2" || element.tagName == "C" || element.tagName == "SPAN") {
			element.innerHTML = text_to_html(value)
		}
		else {
			element.value = value
		}
		if (typeof (data[i]) == 'object') {
			if (data[i].style != null) {
				apply_data_style(element, data[i].style)
			}
			if (data[i].x != null) {
				element.setAttribute("data-x", data[i].x)
				element.setAttribute("data-y", data[i].y)
				element.setAttribute("data-zoom", data[i].zoom)
				element.style.transform = 'translate(' + data[i].x + 'cm, ' + data[i].y + 'cm) scale(' + data[i].zoom + ', ' + data[i].zoom + ')'
			}
		}
		if (element.onblur != null) {
			element.onblur({ target: element })
		}
	}

	if (file.styles != null) {
		for (let path in file.styles) {
			let elem = get_element_from_path(path)
			let style = file.styles[path]
			apply_data_style(elem, style)
		}
	}

	if (file.classList != null) {
		for (let path in file.classList) {
			let elem = get_element_from_path(path)
			let classList = file.classList[path]
			elem.setAttribute("custom-classes", classList)
			elem.classList.add(classList)
		}
	}

	let globalHighlightColor = defaultHighlightColor
	if (file.highlightColors != null) {
		for (let path in file.highlightColors) {
			let elem = get_element_from_path(path)
			let highlightColor = file.highlightColors[path]
			apply_highlight_color(elem, highlightColor)

			if (path == ":root") {
				globalHighlightColor = highlightColor
			}
		}
	}
	let colorPicker = document.getElementById("global-highlight-picker")
	colorPicker.value = globalHighlightColor

	update_titles(data["character-name"], null)
}

function apply_data_style(elem, style) {
	reset_trait_group(elem)
	if (style != null) {
		elem.setAttribute("data-style", style)
		for (let sub_style of style.split(" ")) {
			elem.classList.add(sub_style)
		}
	}
}

function apply_highlight_color(elem, color) {
	elem.setAttribute("highlight-color", color)
	elem.style.setProperty("--highlight", color)
}

function on_drag_enter(e) {
	e.preventDefault()
	e.stopPropagation()
}
function on_drag_leave(e) {
	e.preventDefault();
	e.stopPropagation();
}

function on_drop(e) {
	on_drag_leave(e);

	e.preventDefault()
	e.stopPropagation()

	var blob = e.dataTransfer.files[0];
	var reader = new FileReader();
	reader.addEventListener("loadend", function () {
		var text = reader.result;
		var data = JSON.parse(text)
		load_character(data)
	});
	reader.readAsText(blob)
}

function load_character_path(path) {
	fetch(path)
		.then((response) => response.json())
		.then((json) => load_character(json));
}

function add_group(e, class_name) {
	var template = document.querySelector("." + class_name + ".template")
	new_group = template.cloneNode(true);
	new_group.classList.remove("template")
	e.target.parentElement.insertBefore(new_group, e.target)
	init_event_handlers(new_group)
}

function add_page(e) {
	add_group(e, "page")
	install_title_listeners()
}

function add_trait_group(e) {
	add_group(e, "trait-group")
}

function add_trait(e) {
	add_group(e, "trait")
}

function install_title_listeners() {
	console.log('install_title_listeners')
	let titles = document.getElementsByClassName("title")
	console.log(titles)
	for (let title of titles) {
		title.addEventListener('input', function () {
			let character_name = title.innerText
			console.log(character_name)
			update_titles(character_name, title)
		})
	}
}

function update_titles(character_name, excluding_title) {
	let titles = document.getElementsByClassName("title")
	for (let title of titles) {
		if (title != excluding_title) {
			title.innerText = character_name
		}
	}
	if (character_name == "NAME" || character_name.length == 0) {
		character_name = "Cortex Prime"
	}
	document.title = character_name + " Character Sheet"
}

function update_attribute_positions() {
	var attributes = document.querySelectorAll(".attribute:not(.template)")

	document.getElementById("attribute-curve").style.display = (attributes.length <= 1) ? "none" : "block";

	if (attributes.length == 1) {
		var a = attributes[0]
		a.style.left = ((115 + 176) * 0.5 + 3.5) + "mm"
		a.style.top = "120mm"
		a.classList.remove("vertical");
		a.parentElement.classList.remove("vertical");
		return
	}

	for (var i = 0; i < attributes.length; i++) {
		var a = attributes[i]
		var alpha = i / (attributes.length - 1)

		var left = 115;
		var right = 176;
		var height = 10;
		var top = 107.5;

		if (attributes.length > 5) {
			a.classList.add("vertical");
			a.parentElement.classList.add("vertical");
		}
		else {
			a.classList.remove("vertical");
			a.parentElement.classList.remove("vertical");
		}

		var x = (right - left) * alpha + left + 3.5
		a.style.left = x + "mm"

		var y = Math.sin(alpha * 3.1415926535) * height + top - 3
		a.style.top = y + "mm"
	}
}
function add_attribute(e) {
	add_group(e, "attribute")
	update_attribute_positions()
}
function remove_attribute(e) {
	remove_item(e)
	update_attribute_positions()
}

function reset_trait_group(elem) {
	elem.classList.remove("default")

	elem.classList.remove("abilities")
	elem.classList.remove("compact")
	elem.classList.remove("detailed-values")
	elem.classList.remove("milestones")
	elem.classList.remove("resources")
	elem.classList.remove("roles")
	elem.classList.remove("signature-asset")
	elem.classList.remove("stress")
	elem.classList.remove("stress-descriptions")
	elem.classList.remove("values")

	elem.removeAttribute("data-style")
}

function set_trait_group_name(e) {
	if (e.target.parentElement.getAttribute("data-style") != null) return;

	//	console.log("SET TRAIT GROUP NAME")
	//	e.target.parentElement.id = e.target.innerText.toLowerCase();

	reset_trait_group(e.target.parentElement);

	if (e.target.innerText.toLowerCase() == "roles") {
		e.target.parentElement.classList.add("values");
	}
	else if (e.target.innerText.toLowerCase() == "signature asset" || e.target.innerText.toLowerCase() == "signature assets") {
		e.target.parentElement.classList.add("signature-asset");
	}
	else if (e.target.innerText.toLowerCase() == "milestones") {
		e.target.parentElement.classList.add("milestones");
	}
	else if (e.target.innerText.toLowerCase() == "values") {
		e.target.parentElement.classList.add("values");
	}
	else if (e.target.innerText.toLowerCase() == "emotions") {
		e.target.parentElement.classList.add("values");
	}
	else if (e.target.innerText.toLowerCase() == "skills") {
		e.target.parentElement.classList.add("values");
	}
	else if (e.target.innerText.toLowerCase() == "specialties") {
		e.target.parentElement.classList.add("values");
	}
	else if (e.target.innerText.toLowerCase() == "resource") {
		e.target.parentElement.classList.add("resources");
	}
	else if (e.target.innerText.toLowerCase() == "resources") {
		e.target.parentElement.classList.add("resources");
	}
	else if (e.target.innerText.toLowerCase() == "stress") {
		e.target.parentElement.classList.add("stress");
	}
}

g_dragging = false;
g_drag_x = 0
g_drag_y = 0
function start_drag(e) {
	g_dragging = true
	e.target.setPointerCapture(e.pointerId)
	g_drag_x = e.pageX
	g_drag_y = e.pageY
	if (e.ctrlKey) {
		g_drag_y -= (e.target.getAttribute('data-zoom') - 1.0) * -500.0
	}
	else {
		g_drag_x -= e.target.getAttribute('data-x') * 96.0 / 2.54
		g_drag_y -= e.target.getAttribute('data-y') * 96.0 / 2.54
	}
}
function end_drag(e) {
	g_dragging = false
	e.target.releasePointerCapture(e.pointerId)
	e.preventDefault()
	e.stopPropagation()
}
function drag_move(e) {
	if (!g_dragging) return;

	var x = (e.pageX - g_drag_x)
	var y = (e.pageY - g_drag_y)
	if (e.ctrlKey) {
		var zoom = y / -500.0 + 1.0
		x = parseFloat(e.target.getAttribute('data-x'))
		y = parseFloat(e.target.getAttribute('data-y'))
		e.target.setAttribute('data-zoom', zoom)
		e.target.style.transform = 'translate(' + x + 'cm, ' + y + 'cm) scale(' + zoom + ', ' + zoom + ')'
	}
	else {
		x *= 2.54 / 96.0
		y *= 2.54 / 96.0
		var zoom = e.target.getAttribute('data-zoom')
		e.target.setAttribute('data-x', x)
		e.target.setAttribute('data-y', y)
		e.target.style.transform = 'translate(' + x + 'cm, ' + y + 'cm) scale(' + zoom + ', ' + zoom + ')'
	}
}

g_modal_callback = null
function close_modal(e) {
	var modals = document.querySelectorAll(".modal")
	for (var m = 0; m < modals.length; m++) {
		modals[m].style.display = 'none'
	}
	var bg = document.getElementById("modal-bg")
	bg.style.display = 'none'
	if (g_modal_callback != null) {
		g_modal_callback()
		g_modal_callback = null
	}
}
function show_modal(id, left, top, callback) {
	g_modal_callback = callback
	var bg = document.getElementById("modal-bg")
	bg.style.display = 'block'
	var modal = document.getElementById(id)
	modal.style.display = 'block'
	modal.style.left = left
	modal.style.top = top
	var input = modal.querySelector("input");
	if (input != null) {
		modal.querySelector("input").select()
	}
}

function change_image_url(e) {
	var url = document.querySelector("#url-modal input")
	var img = e.target.parentElement.querySelector("img")
	url.value = img.src
	show_modal("url-modal", e.pageX, e.pageY, function () {
		img.src = url.value
		img.setAttribute("data-x", 0)
		img.setAttribute("data-y", 0)
		img.setAttribute("data-zoom", 1)
		img.style.transform = 'translate(0, 0) scale(1)'
	})
}

function set_global_highlight_color(e) {
	let colorPicker = document.getElementById("global-highlight-picker")
	let root = document.querySelector(":root")
	apply_highlight_color(root, colorPicker.value)
}

let shouldShowLayoutControls = true
let hideControlsStyleSheet = function () {
	let styleSheet = document.createElement("style")
	styleSheet.innerText = `
		.pages .no-print {
			display: none !important;
		}
	`
	return styleSheet
}()
function toggle_layout_controls(e) {
	shouldShowLayoutControls = !shouldShowLayoutControls
	let layoutControls = document.querySelector("#toggle-layout-controls")
	if (shouldShowLayoutControls) {
		document.head.removeChild(hideControlsStyleSheet)
		layoutControls.classList.remove("controls-hidden")
	} else {
		document.head.appendChild(hideControlsStyleSheet)
		layoutControls.classList.add("controls-hidden")
	}
}

function show_help(e) {
	show_modal("help-modal", e.pageX, e.pageY, function () { })
}

function remove_item(elem) {
	var item = elem.target.parentElement
	item.parentElement.removeChild(item)
}

const defaultHighlightColor = "#C50852"

let g_context_target = null
function show_context_menu(e) {
	g_context_target = e.target
	let traitGroup = g_context_target.parentElement

	let rect = e.target.getBoundingClientRect()
	let x = rect.left + "px"
	let y = rect.top + "px"

	let traitGroupColor = traitGroup.getAttribute("highlight-color")
	let rootColor = document.querySelector(":root").getAttribute("highlight-color")
	let colorPicker = document.getElementById("trait-collection-highlight-picker")
	colorPicker.value = traitGroupColor ?? rootColor ?? defaultHighlightColor

	// Check matching data-style
	let traitGroupStyle = traitGroup.getAttribute("data-style")
	let menu = document.getElementById("context-menu")
	let menuEntries = document.querySelectorAll("#context-menu #styles input")
	let found = false
	for (let menuEntry of menuEntries) {
		let menuStyle = menuEntry.getAttribute("data-style")
		let checked = menuStyle == traitGroupStyle
		menuEntry.checked = checked
		found = found || checked
	}
	if (!found) {
		document.getElementById("style-default").checked = true
	}

	show_modal("context-menu", x, y, function () {
		let menu = document.getElementById("context-menu")
		menu.style.display = "none"
	})
}

function close_context_menu() {
	g_context_target = null
	close_modal(null)
}

function set_trait_collection_highlight_color(e) {
	let colorPicker = document.getElementById("trait-collection-highlight-picker")
	let traitGroup = g_context_target.parentElement
	apply_highlight_color(traitGroup, colorPicker.value)
	
	// Do NOT close_context_menu()
}

function remove_trait_collection_highlight_color(e) {
	let traitGroup = g_context_target.parentElement
	traitGroup.removeAttribute("highlight-color")
	traitGroup.style.removeProperty("--highlight")
	
	close_context_menu()
}

function set_style(e) {
	let elem = g_context_target.parentElement
	let style = e.target.getAttribute("data-style")
	apply_data_style(elem, style)
	
	close_context_menu()
}

function context_menu_remove_item(e) {
	remove_item({ target: g_context_target })
	
	close_context_menu()
}

function move_to_top(e) {
	let traitGroup = g_context_target.parentElement
	let column = traitGroup.parentElement
	column.prepend(traitGroup)

	close_context_menu()
}

function move_to_bottom(e) {
	let traitGroup = g_context_target.parentElement
	let column = traitGroup.parentElement
	let traitGroups = column.children
	let traitGroupPlaceholder = traitGroups[traitGroups.length - 1]
	traitGroupPlaceholder.before(traitGroup)

	close_context_menu()
}

window.onload = function () {
	document.addEventListener("keydown", function (e) {
		if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
			e.preventDefault()
			save_character(e)
		}
	}, false);

	init_event_handlers(document)
}
