class KeyboardShortcutParser {
  static parseShortcut(keypress) {
    var shortcutCombo = '';
  
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
    shortcutCombo += keypress.key.toUpperCase();
  
    return shortcutCombo;
  }
}

export default KeyboardShortcutParser;
