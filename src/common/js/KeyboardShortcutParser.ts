class KeyboardShortcutParser {
  static parseShortcut(keypress) {
    let shortcutCombo = '';

    if (keypress.ctrlKey) {
      shortcutCombo += 'Ctrl + ';
    }
    if (keypress.shiftKey) {
      shortcutCombo += 'Shift + ';
    }
    if (keypress.metaKey) {
      shortcutCombo += 'Meta + ';
    }
    if (keypress.altKey) {
      shortcutCombo += 'Alt + ';
    }
    if (keypress.key) {
      shortcutCombo += keypress.key.toUpperCase();
    } else {
      shortcutCombo += '<mouse action>'
    }
    return shortcutCombo;
  }

  static generateShortcutFromKeypress(event) {
    return {
      ctrlKey: event.ctrlKey,
      shiftKey: event.altKey,
      altKey: event.altKey,
      code: event.code,
      key: event.key,
      keyup: true,
      keydown: false,
      type: event.type,     // only needed for purposes of EditShortcutButton
    }
  }
}

export default KeyboardShortcutParser;
