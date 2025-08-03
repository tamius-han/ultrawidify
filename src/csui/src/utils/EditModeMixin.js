export default {
  data() {
    return {
      editMode: false,
      editModeOptions: {}
    }
  },
  methods: {
    enableEditMode() {
      this.editMode = true;
      this.editModeOptions = {};
    },

    disableEditMode() {
      this.editMode = false;
    },

    editAction(command, index, actionType) {
      try {
        if (!this.editModeOptions[actionType]) {
          this.editModeOptions[actionType] = {selected: command, selectedIndex: index}
        } else {
          this.editModeOptions[actionType].selected = command;
          this.editModeOptions[actionType].selectedIndex = index;
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::editAction():`, e);
      }
    },

    updateSelectedShortcut(shortcut, actionType) {
      try {
        if (!this.editModeOptions[actionType]?.selected) {
          return;
        } else {
          this.editModeOptions[actionType].selected.shortcut = shortcut
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::updateShortcut():`, e);
      }
    },

    cancelEdit(actionType) {
      try {
        if (!this.editModeOptions[actionType]) {
          return;
        } else {
          this.editModeOptions[actionType] = undefined;;
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::cancelEdit():`, e);
      }
    },

    validateAspectRatio(actionType) {
      // deal with potentially invalid aspect ratios
      if (this.editModeOptions[actionType].selected.arguments.ratio.includes(':')) {
        const ratioParts = this.editModeOptions[actionType].selected.arguments.ratio.split(':');
        if (ratioParts.length !== 2) {
          this.editModeOptions[actionType].error = 'Entered aspect ratio is not valid.';
          return false;
        } else {
          const ratio = ratioParts[0] / ratioParts[1];
          if (isNaN(ratio) || ratio <= 0) {
            this.editModeOptions[actionType].error = 'Entered aspect ratio is not valid.';
            return false;
          }
          this.editModeOptions[actionType].selected.arguments.ratio = ratio;
        }
      } else {
        if (isNaN(this.editModeOptions[actionType].selected.arguments.ratio)) {
          this.editModeOptions[actionType].error = "Entered aspect ratio is not valid.";
          return false;
        }
      }

      delete this.editModeOptions[actionType].error;
      return true;
    },

    /**
     *  Updates button label, ideally after aspect ratio is entered,
     *  after input field blurred, and only if aspect ratio is valid.
     */
    updateLabel(actionType) {
      if (this.validateAspectRatio(actionType) && this.editModeOptions[actionType].selected.label === 'New aspect ratio') {
        this.editModeOptions[actionType].selected.label = this.editModeOptions[actionType].selected.arguments.ratio;
      }
    },

    saveShortcut(actionType) {
      if (! this.validateAspectRatio(actionType)) {
        return;
      }

      if (!this.editModeOptions[actionType]?.selectedIndex) {
        this.settings.active.commands[actionType].push(this.editModeOptions[actionType].selected);
      }
      this.settings.active.commands[actionType][this.editModeOptions[actionType].selectedIndex] = this.editModeOptions[actionType]?.selected;
      this.settings.saveWithoutReload();

      this.editModeOptions[actionType] = undefined;
    },

    deleteAction(actionType) {
      const selectedIndex = this.editModeOptions[actionType].selectedIndex;

      // prevent deleting first item if 'delete' button shows on 'add new' dialog
      if (selectedIndex === undefined || selectedIndex === null) {
        return;
      }

      this.settings.active.commands[actionType].splice(selectedIndex, 1);
      this.settings.saveWithoutReload();

      this.editModeOptions[actionType] = undefined;
    },

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
