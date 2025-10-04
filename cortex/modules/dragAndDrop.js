import { load_character } from "./load.js"

export function on_drag_enter(e) {
	e.preventDefault()
	e.stopPropagation()
}

export function on_drag_leave(e) {
	e.preventDefault()
	e.stopPropagation()
}

export function on_drop(e) {
	on_drag_leave(e)

	e.preventDefault()
	e.stopPropagation()

	let blob = e.dataTransfer.files[0]
	let reader = new FileReader()
	reader.addEventListener("loadend", function () {
		let text = reader.result
		let data = JSON.parse(text)
		load_character(data)
	})
	reader.readAsText(blob)
}