import { load_character } from "./load.js"

function ignore(e) {
	e.preventDefault()
	e.stopPropagation()
}

document.body.ondragenter = ignore
document.body.ondragover = ignore
document.body.ondragleave = ignore

document.body.ondrop = function(e) {
	ignore(e)

	let blob = e.dataTransfer.files[0]
	let reader = new FileReader()
	reader.addEventListener("loadend", function () {
		let text = reader.result
		let data = JSON.parse(text)
		load_character(data)
	})
	reader.readAsText(blob)
}