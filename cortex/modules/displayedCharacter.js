// MARK: Character Name
export const defaultCharacterName = "NAME"

export function isCharacterNameValid(characterName) {
  return characterName.length > 0 && characterName !== defaultCharacterName
}

export function updateDocumentTitle(characterName) {
  if (!isCharacterNameValid(characterName)) {
    characterName = "Cortex Prime"
  }
  document.title = characterName + " Character Sheet"
}

export function currentCharacterName() {
  return document.querySelector(".title").innerText // Get name from first page
}

export function isCurrentCharacterNameValid() {
  return isCharacterNameValid(currentCharacterName())
}

// MARK: Events

export const characterEvents = new EventTarget()

// MARK: Switching Events

export function willSwitchDisplayedCharacterSheet() {
  characterEvents.dispatchEvent(new CustomEvent("willSwitchDisplayedCharacterSheet", {
    detail: {},
  }))
}

export function didSwitchDisplayedCharacterSheet() {
  characterEvents.dispatchEvent(new CustomEvent("didSwitchDisplayedCharacterSheet", {
    detail: {},
  }))
}

// MARK: Modification Events

export function didModifyDisplayedCharacterSheet() {
  characterEvents.dispatchEvent(new CustomEvent("didModifyDisplayedCharacterSheet", {
    detail: {},
  }))
}