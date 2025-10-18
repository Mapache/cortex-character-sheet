export function formatRelativeTime(timestamp) {
  const now = new Date()
  const targetDate = new Date(timestamp)
  const millis = targetDate.getTime() - now.getTime()

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto", style: "long" })

  // Determine the most appropriate unit
  const oneSecond = 1000
  const oneMinute = 60 * oneSecond
  const oneHour = 60 * oneMinute
  const oneDay = 24 * oneHour
  const oneWeek = 7 * oneDay

  function format(duration, unit) {
    return rtf.format(Math.round(duration), unit)
  }

  if (Math.abs(millis) < oneMinute) {
    return format(millis / oneSecond, "second")
  } else if (Math.abs(millis) < oneHour) {
    return format(millis / oneMinute, "minute") + ", " + format((millis % oneMinute) / oneSecond, "second")
  } else if (Math.abs(millis) < oneDay) {
    return format(millis / oneHour, "hour") + ", " + format((millis % oneHour) / oneMinute, "minute")
  } else if (Math.abs(millis) < oneWeek) {
    return format(millis / oneDay, "day") + ", " + format((millis % oneDay) / oneHour, "hour")
  } else {
    return targetDate
  }
}