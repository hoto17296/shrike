class Pattern {
  constructor(obj) {
    if ( ! Array.isArray(obj) ) obj = [obj];
    this._patterns = obj.map((p) => {
      if ( p instanceof RegExp || typeof p === 'function' ) return p;
      if ( typeof p === 'string' ) return new RegExp(p);
    });
  }

  match(msg) {
    if ( typeof msg !== 'object' || typeof msg.text !== 'string' ) throw new TypeError();
    for (let i = 0; i < this._patterns.length; i++) {
      let p = this._patterns[i];
      let matched = null;
      if ( p instanceof RegExp ) matched = msg.text.match(p);
      if ( typeof p === 'function' ) matched = p( Object.assign({}, msg) );
      if ( matched ) return matched;
    }
    return null;
  }
}

module.exports = Pattern;
