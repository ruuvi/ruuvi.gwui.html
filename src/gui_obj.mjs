class GuiObj {
  #obj

  constructor (className, obj, tagName, attrName = undefined, attrValue = undefined) {
    this.#obj = obj
    if (obj === undefined) {
      throw new Error(`${className}: The obj argument is undefined`)
    }
    if (obj === null) {
      throw new Error(`${className}: The obj argument is null`)
    }
    if (!obj.jquery) {
      throw new Error(`${className}: The obj is not jquery object`)
    }
    if (obj.prop('tagName') !== tagName) {
      throw new Error(`${className} class constructor requires an '${tagName}' element, got '${obj.prop('tagName')}'.`)
    }
    if (attrName && attrValue) {
      if (obj.attr(attrName) !== attrValue) {
        throw new Error(`${className} class constructor requires attribute '${attrName}' with value '${attrValue}', got '${obj.attr(attrName)}'.`)
      }
    }
  }

  get _obj () {
    return this.#obj
  }
}

export default GuiObj
