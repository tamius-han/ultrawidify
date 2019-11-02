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
}

export default KeyboardShortcutParser;