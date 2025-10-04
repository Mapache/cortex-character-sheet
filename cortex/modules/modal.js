let g_modal_callback = null
export function close_modal(e) {
  let modals = document.querySelectorAll(".modal")
  for (let modal of modals) {
    modal.style.display = "none"
  }
  let bg = document.getElementById("modal-bg")
  bg.style.display = "none"
  if (g_modal_callback != null) {
    g_modal_callback()
    g_modal_callback = null
  }
}

export function show_modal(id, left, top, callback) {
  g_modal_callback = callback
  let bg = document.getElementById("modal-bg")
  bg.style.display = "block"
  let modal = document.getElementById(id)
  modal.style.display = "block"
  modal.style.left = left
  modal.style.top = top
  let input = modal.querySelector("input");
  if (input != null) {
    modal.querySelector("input").select()
  }
}