import { CampaignPermissions, cloud } from "./cloud.js"
import { Flags } from "./flags.js"
import { formatRelativeTime } from "./formatting.js"
import { menu, menuEntry, menuDivider, menuLabel, menuTextInput } from "./menu.js"
import { Modal } from "./modal.js"
import { ToggleableStyle } from "./toggleableStyle.js"

const messagingVisible = new ToggleableStyle(
  "#messaging",
  "messaging-visible",
  "messaging-hidden",
  `
		#messaging {
      position: fixed;
      left: 60px;
      margin-top: 10mm;
      width: 200px;
      height: 90%;

      display: flex;
      flex-direction: column;
      justify-content: flex-end;

      border-radius: 5px;
      border: 1px solid #D3D3D3;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
		}

    #messages {
      overflow-y: auto;
    }

    #pages {
      margin-left: 220px;
    }
	`,
  `
		#messaging {
			display: none !important;
		}
	`,
  false)

class Messages {
  constructor() {
    this.messages = null
    this.messagesDiv = document.querySelector("#messages")
  }

  // MARK: Visibility

  async show() {
    this.visible = true
    messagingVisible.enable()

    if (!this.messages) {
      this.messages = await cloud.fetchMessages()
      console.log(this.messages)
      for (const message of this.messages) {
        this.messagesDiv.appendChild(this.htmlForMessage(message))
      }
    }
  }

  hide() {
    this.visible = false
    messagingVisible.disable()
  }

  setVisible(visible) {
    if (visible) {
      this.show()
    } else {
      this.hide()
    }
  }

  toggle() {
    this.setVisible(!this.visible)
  }

  // MARK: Rendering

  htmlForMessage(message) {
    const div = document.createElement("div")
    div.innerText = message.text
    return div
  }
}

export const messages = new Messages()