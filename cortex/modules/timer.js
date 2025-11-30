// For batching up a series of triggers to reduce writes / updates.
export class RestartableTimeout {
  /**
   * @param {async () => void} action 
   * @param {Number} timeout - In milliseconds
   */
  constructor(action, timeout) {
    this.action = action
    this.timeout = timeout
    this.timerId = null
  }

  // Starts the timer from the beginning if it is not already running. Has no effect if the timer is already running.
  start(...args) {
    if (!this.timerId) {
      this.timerId = setTimeout(async () => {
        await this.action(...args)
        this.timerId = null
      }, this.timeout)
    }
  }

  // Stops the timer if it is running. Has no effect if the timer is not running.
  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  // Starts the timer from the beginning. Resets the timer if it is already running.
  restart(...args) {
    this.stop()
    this.start(...args)
  }

  // Fires the timer now if it is currently running.
  async finish(...args) {
    if (this.timerId) {
      await this.fire(...args)
    }
  }

  // Forcibly fires the timer now, whether or not it is running.
  async fire(...args) {
    this.stop()
    await this.action(...args)
  }

}