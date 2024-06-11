import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser';

export default {
  methods: {
    /**
     * Parses command's keyboard shortcut into human-readable label
     */
    getKeyboardShortcutLabel(command) {
      if (! command.shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(command.shortcut);
    },
  }
}
