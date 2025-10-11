import { cloud } from "./cloud.js"
import { whenInteractive } from "./util.js"

const shareParam = "share"
const shareSeparator = "-"

function createShareUrl(campaignId, key) {
  const windowUrl = window.location.href
  const baseUrl = windowUrl.split("?")[0]
  const shareUrl = baseUrl + "?" + shareParam + "=" + campaignId + shareSeparator + key
  return shareUrl
}

export async function copyShareUrl(campaign, access) {
  try {
    const key = await cloud.accessKey(campaign, access)
    const shareUrl = createShareUrl(campaign.id, key)
    await navigator.clipboard.writeText(shareUrl)
    console.log('Copied share URL:', shareUrl)
  } catch (err) {
    console.error('Failed to copy share URL: ', err)
  }
}

async function parseShareUrl() {
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  if (urlParams.has(shareParam)) {
    const shareCode = urlParams.get(shareParam)
    const firstHyphen = shareCode.indexOf(shareSeparator)
    const campaignId = shareCode.substring(0, firstHyphen)
    const accessKey = shareCode.substring(firstHyphen + 1)
    await cloud.updateAccessKey(campaignId, accessKey)
    await cloud.switchCampaign(campaignId)
  }
}

whenInteractive(parseShareUrl)