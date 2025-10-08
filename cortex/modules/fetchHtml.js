export async function fetchHtml(path) {
  return fetch(path)
    .then(response => response.text()) // Convert the response to text (HTML)
    .then(html => {
      const template = document.createElement("template")
      template.innerHTML = html
      if (template.content.childNodes.length !== 1) {
        throw new Error(
          "html parameter must represent a single node."
        )
      }
      return template.content.firstChild
    })
    .catch(error => {
      console.error("Error fetching HTML: ", error)
    })
}