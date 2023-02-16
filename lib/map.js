export default class _Map extends Map {
  constructor () {
    super()

    this._offset = -1
  }

  next () {
    const ite = this.entries();
    let currentIndex = 0;
    let result = ite.next();

    this._offset = (this._offset + 1) % this.size

    while (!result.done && currentIndex < this._offset) {
      result = ite.next();
      currentIndex += 1;
    }
    return result.value[1];
  }

  /** @param {string | number} key */
  delete (key) {
    const ite = this.keys();
    let keyIndex = 0;
    let result = ite.next();

    while (!result.done && result.value !== key) {
      result = ite.next()
      keyIndex += 1;
    } 

    if (keyIndex <= this._offset) {
      this._offset -= 1
    }

    return super.delete(key)
  }
}
