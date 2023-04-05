class WindowLocation {
  #window_location

  constructor (window_location) {
    this.#window_location = window_location
  }

  replace (url) {
    if (url === null) {
      this.#window_location.replace('#null')
    } else {
      this.#window_location.replace(url)
    }
  }

  assign (url) {
    if (url === null) {
      this.#window_location.hash = null
    } else {
      this.#window_location.assign(url)
    }
  }
}

export default WindowLocation
