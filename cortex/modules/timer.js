// For batching up a series of triggers to reduce writes / updates.
export class RestartableTimeout {
  /**
   * @param {() => void} action 
   * @param {Number} timeout - In milliseconds
   */
  constructor(action, timeout) {
    this.action = action
    this.timeout = timeout
    this.timerId = null
  }

  start() {
    if (!this.timerId) {
      this.timerId = setTimeout(() => {
        this.action()
        this.timerId = null
      }, this.timeout)
    }
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  restart() {
    this.stop()
    this.start()
  }
}