import { Modal } from "./modal.js"

function update_attribute_positions() {
	let attributes = document.querySelectorAll(".attribute:not(.template)")

	document.getElementById("attribute-curve").style.display = (attributes.length <= 1) ? "none" : "block";

	if (attributes.length == 1) {
		let a = attributes[0]
		a.style.left = ((115 + 176) * 0.5 + 3.5) + "mm"
		a.style.top = "120mm"
		a.classList.remove("vertical");
		a.parentElement.classList.remove("vertical");
		return
	}

	for (let i = 0; i < attributes.length; i++) {
		let a = attributes[i]
		let alpha = i / (attributes.length - 1)

		let left = 115;
		let right = 176;
		let height = 10;
		let top = 107.5;

		if (attributes.length > 5) {
			a.classList.add("vertical");
			a.parentElement.classList.add("vertical");
		}
		else {
			a.classList.remove("vertical");
			a.parentElement.classList.remove("vertical");
		}

		let x = (right - left) * alpha + left + 3.5
		a.style.left = x + "mm"

		let y = Math.sin(alpha * 3.1415926535) * height + top - 3
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

g_dragging = false;
g_drag_x = 0
g_drag_y = 0
function start_drag(e) {
	g_dragging = true
	e.target.setPointerCapture(e.pointerId)
	g_drag_x = e.pageX
	g_drag_y = e.pageY
	if (e.ctrlKey) {
		g_drag_y -= (e.target.getAttribute("data-zoom") - 1.0) * -500.0
	}
	else {
		g_drag_x -= e.target.getAttribute("data-x") * 96.0 / 2.54
		g_drag_y -= e.target.getAttribute("data-y") * 96.0 / 2.54
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

	let x = (e.pageX - g_drag_x)
	let y = (e.pageY - g_drag_y)
	if (e.ctrlKey) {
		let zoom = y / -500.0 + 1.0
		x = parseFloat(e.target.getAttribute("data-x"))
		y = parseFloat(e.target.getAttribute("data-y"))
		e.target.setAttribute("data-zoom", zoom)
		e.target.style.transform = "translate(" + x + "cm, " + y + "cm) scale(" + zoom + ", " + zoom + ")"
	}
	else {
		x *= 2.54 / 96.0
		y *= 2.54 / 96.0
		let zoom = e.target.getAttribute("data-zoom")
		e.target.setAttribute("data-x", x)
		e.target.setAttribute("data-y", y)
		e.target.style.transform = "translate(" + x + "cm, " + y + "cm) scale(" + zoom + ", " + zoom + ")"
	}
}

const portraitURLModal = new Modal("url-modal", function () {})

function change_image_url(e) {
	let url = document.querySelector("#url-modal input")
	let img = e.target.parentElement.querySelector("img")
	url.value = img.src
	portraitURLModal.callback = function () {
		img.src = url.value
		img.setAttribute("data-x", 0)
		img.setAttribute("data-y", 0)
		img.setAttribute("data-zoom", 1)
		img.style.transform = "translate(0, 0) scale(1)"
	}
	portraitURLModal.show(e)
}