import Debug from '../conf/Debug';

class ObjectCopy {
  static addNew(current, newValues){
    
    // clone target
    let out = JSON.parse(JSON.stringify(newValues));

    if(! current) {
      if(Debug.debug) {
        console.log("[ObjectCopy::addNew] There's no existing value. Returning target value.");
      }

      return out;
    }

    for(let k in out) {
      // if current key exist, replace it with existing value. Take no action otherwise.
      if(current[k]) {

        // Types and constructors of objects must match. If they don't, we always use the new value.
        if(typeof out[k] === typeof current[k] && out[k].constructor === current[k].constructor) {
          
          // objects are special, we need to check them recursively.
          if(out[k] && typeof out[k] === 'object' && out[k].constructor === Object ) {
            if(Debug.debug && Debug.settings) {
              console.log("[ObjectCopy::addNew] current key contains an object. Recursing!")
            }

            out[k] = this.addNew(current[k], out[k]);
          } else {
            out[k] = current[k];       
          }
        }
      }
    }

    // add the values that would otherwise be deleted back to our object. (We need that so user-defined
    // sites don't get forgotten)
    for(let k in current) {
      if (! out[k]) {
        out[k] = current[k];
      }
    }

    return out;
  }

  static overwrite(current, newValues){
    for(let k in newValues) {
      // if current key exist, replace it with existing value. Take no action otherwise.
      if (current[k] !== undefined) {
        // Types and constructors of objects must match. If they don't, we always use the new value.
        if (typeof newValues[k] === typeof current[k] && newValues[k].constructor === current[k].constructor) {
          
          // objects are special, we need to check them recursively.
          if(current[k] && typeof current[k] === 'object' && current[k].constructor === Object ) {
            if(Debug.debug && Debug.settings) {
              console.log("[ObjectCopy::addNew] current key contains an object. Recursing!")
            }

            current[k] = this.overwrite(current[k], newValues[k]);
          } else {
            current[k] = newValues[k];       
          }
        } else {
          current[k] = newValues[k];
        }
      }
      else if (newValues[k] !== undefined) {
        current[k] = newValues[k];
      }
    }
    return current;
  }

  static pruneUnused(existing, target, ignoreKeys) {
    // TODO: implement at some other date
    // existing: object that we have.
    // target: object that we want
    // ignoreKeys: if key is an object, we don't recursively call this function on that key
  }
}

export default ObjectCopy;