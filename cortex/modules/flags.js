export class Flags {
  static development = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  static useDevelopmentHook = false
  static useEditableHTML = true
}