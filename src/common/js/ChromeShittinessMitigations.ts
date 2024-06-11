/**
 * For some reason, Chrome really doesn't like when chrome.runtime
 * methods are wrapped inside a ES6 proxy object. If 'port' is a
 * ES6 Proxy of a Port object that `chrome.runtime.connect()` creates,
 * then Chrome will do bullshits like `port.sendMessage` and
 * `port.onMessage.addListener` crashing your Vue3 UI with bullshits
 * excuses, e.g.
 *
 *   | TypeError: Illegal invocation. Function must be called on
 *   | an object of type Port
 *
 * which is some grade A bullshit because Firefox can handle that just
 * fine.
 *
 * There's two ways how I could handle this:
 *   * Find out how to get the original object from the proxy Vue3
 *     creates, which would take time and ruin my xmass holiday, or
 *   * make a global object with a passive-aggressive name and ignore
 *     the very real possibility that there's prolly a reason Chrome
 *     does things in its own very special(tm) way, as if it had one
 *     extra chromosome over Firefox.
 *
 * Easy choice, really.
 */
export class ChromeShittinessMitigations {
  static port = null;

  static setProperty(property, value) {
    ChromeShittinessMitigations[property] = value;
  }
}

export default ChromeShittinessMitigations;
