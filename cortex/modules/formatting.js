
// Determine the most appropriate unit
const oneSecond = 1000
const oneMinute = 60 * oneSecond
const oneHour = 60 * oneMinute
const oneDay = 24 * oneHour
const oneWeek = 7 * oneDay

export function formatRelativeTime(timestamp) {
  const locale = "en-US"

  const now = new Date()
  const targetDate = new Date(timestamp)
  const millis = targetDate.getTime() - now.getTime()

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" })


  function format(duration, unit) {
    return rtf.format(Math.round(duration), unit)
  }

  // Omits " ago" for concatenating a more detailed time unit
  function format1(duration, unit) {
    return rtf.format(Math.round(duration), unit).split(" ago")[0]
  }

  if (Math.abs(millis) < oneMinute) {
    return format(millis / oneSecond, "second")
  } else if (Math.abs(millis) < oneHour) {
    return format1(millis / oneMinute, "minute") + ", " + format((millis % oneMinute) / oneSecond, "second")
  } else if (Math.abs(millis) < oneHour * 3) {
    return format1(millis / oneHour, "hour") + ", " + format((millis % oneHour) / oneMinute, "minute")
  } else if (Math.abs(millis) < oneDay) {
    const day = (targetDate.getDate() === now.getDate()) ? "Today" : "Yesterday"
    return day + ", " + targetDate.toLocaleTimeString(locale)
  } else if (Math.abs(millis) < oneWeek) {
    return targetDate.toLocaleString(locale, { weekday: "long" }) + ", " + targetDate.toLocaleTimeString(locale)
  } else {
    return targetDate.toLocaleString(locale, { dateStyle: "medium", timeStyle: "medium" })
  }
}

export function formatAbsoluteTime(timestamp) {
  const locale = "en-US"

  const now = new Date()
  const targetDate = new Date(timestamp)
  const millis = targetDate.getTime() - now.getTime()

  if (Math.abs(millis) < oneDay) {
    const day = (targetDate.getDate() === now.getDate()) ? "" : "Yesterday "
    return day + targetDate.toLocaleTimeString(locale)
  } else if (Math.abs(millis) < oneWeek) {
    return targetDate.toLocaleString(locale, { weekday: "long" }) + ", " + targetDate.toLocaleTimeString(locale)
  } else {
    return targetDate.toLocaleString(locale, { dateStyle: "medium", timeStyle: "medium" })
  }
}