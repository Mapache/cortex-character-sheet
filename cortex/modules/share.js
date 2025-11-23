import { cloud } from "./cloud.js"
import { HashHandler } from "./urlHashHandler.js"

const shareParam = "share"
const shareSeparator = "-"

function createShareUrl(campaignId, key) {
  const url = new URL(window.location.href)
  url.hash = shareParam + "=" + campaignId + shareSeparator + key
  return url
}

export async function copyShareUrl(campaign, access) {
  try {
    const key = await cloud.accessKey(campaign, access)
    const shareUrl = createShareUrl(campaign.id, key)
    await navigator.clipboard.writeText(shareUrl)
    console.log("Copied share URL:", shareUrl)
    return shareUrl
  } catch (err) {
    console.error("Failed to copy share URL:", err)
  }
}

async function parseShareCode(shareCode) {
  const firstHyphen = shareCode.indexOf(shareSeparator)
  const campaignId = shareCode.substring(0, firstHyphen)
  const accessKey = shareCode.substring(firstHyphen + 1)
  await cloud.updateAccessKey(campaignId, accessKey)
  await cloud.switchCampaignId(campaignId)
}

new HashHandler(shareParam, parseShareCode).addListener()