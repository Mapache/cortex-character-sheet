export function c_to_html(html) {
  if (html == "-") {
    return "–"
  }
  if (html == "O" || html == "o") {
    return "∅"
  }
  html = html.replace(/\bd4\b/ig, "4")
  html = html.replace(/\bd6\b/ig, "6")
  html = html.replace(/\bd8\b/ig, "8")
  html = html.replace(/\bd?10\b/ig, "0")
  html = html.replace(/\bd?12\b/ig, "2")
  html = html.replace(/\bPP\b/ig, "<pp></pp>")
  html = html.replace(/\bMOTES?\b/ig, "<mote></mote>")
  html = html.replace(/\bHERP\b/ig, "<hero></hero>")
  html = html.replace(/\bHERO ?POINTS?\b/ig, "<hero></hero>")
  return html
}

export function text_to_html(html) {
  if (html.search(/^-/m) != -1) {
    html = html.replace(/^- *(.*)$/m, "<ul><li>$1</li>")
    html = html.replace(/^- *(.*)$/gm, "<li>$1</li>")
    const index = html.lastIndexOf("</li>") + 5
    html = html.substring(0, index) + "</ul>" + html.substring(index)
  }

  html = html.replace(/\bd4\b/ig, "<c>4</c>")
  html = html.replace(/\bd6\b/ig, "<c>6</c>")
  html = html.replace(/\bd8\b/ig, "<c>8</c>")
  html = html.replace(/\bd10\b/ig, "<c>0</c>")
  html = html.replace(/\bd12\b/ig, "<c>2</c>")
  html = html.replace(/\bPP\b/ig, "<pp></pp>")
  html = html.replace(/\bMOTES?\b/ig, "<mote></mote>")
  html = html.replace(/\bHERP\b/ig, "<hero></hero>")
  html = html.replace(/\bHERO ?POINTS?\b/ig, "<hero></hero>")
  html = html.replace(/\n/g, "<br>")
  html = html.replace(/\<\/li\>\<br\>/g, "</li>")
  html = html.replace(/\<\/li\>\<br\>/g, "</li>")
  html = html.replace(/\<\/ul\>\<br\>/g, "</ul>")
  html = html.replace(/&nbsp;/g, " ")
  html = html.replace(/\[([^\[\]]*)]/g, "<ref>$1</ref>")
  html = html.replace(/\*\*\*([^\*]*)\*\*\*/g, "<b><i>$1</i></b>")
  html = html.replace(/\*\*([^\*]*)\*\*/g, "<b>$1</b>")
  html = html.replace(/\*([^\*]*)\*/g, "<i>$1</i>")

  return html
}

export function html_to_text(text) {
  text = text.replace(/<c>4<\/c>/g, "d4")
  text = text.replace(/<c>6<\/c>/g, "d6")
  text = text.replace(/<c>8<\/c>/g, "d8")
  text = text.replace(/<c>0<\/c>/g, "d10")
  text = text.replace(/<c>2<\/c>/g, "d12")
  text = text.replace(/<pp><\/pp>/g, "PP")
  text = text.replace(/<mote><\/mote>/g, "mote")
  text = text.replace(/<hero><\/hero>/g, "hero point")
  text = text.replace(/<br>/g, "\n")
  text = text.replace(/<ul>/g, "")
  text = text.replace(/<\/ul>/g, "")
  text = text.replace(/<li>/g, "- ")
  text = text.replace(/<\/li>/g, "\n")
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/<ref>([^<]*)<\/ref>/g, "[$1]")

  return text
}