<template>
  <div class="flex flex-row">
    <div
      class="flex-grow button"
      @click="editShortcut()"

    >
      <template v-if="!editing">
        {{shortcutDisplay}}
      </template>
      <template v-else>
        {{currentKeypress ?? 'Press a key'}}
        <input ref="input"
          class="hidden-input"
          @keyup.capture="keyup($event)"
          @keydown.capture="keydown($event)"
          @input.prevent=""
          @blur="editing = false;"
        >
      </template>
    </div>
    <div class="button" @click="$emit('shortcutChanged', null)">
      <mdicon name="delete"></mdicon>
    </div>
  </div>
</template>

<script>
import KeyboardShortcutParser from '../js/KeyboardShortcutParser';

export default {
  props: {
    shortcut: Object,
  },
  data() {
    return {
      currentKeypress: undefined,
      currentKey: undefined,
      editing: false,
    }
  },
  computed: {
    shortcutDisplay() {
      if (!this.shortcut) {
        return '(no shortcut)'
      }
      return KeyboardShortcutParser.parseShortcut(this.shortcut);
    }
  },
  methods: {
    editShortcut() {
      this.editing = true;
      this.currentKeypress = undefined;
      this.currentKey = undefined;

      // input doesn't exist now, but will exist on the next tick
      this.$nextTick(()=> this.$refs.input.focus());
    },
    /**
     * Updates currently pressed keypress for display
     */
    keydown(event) {
      // event.repeat is set to 'true' when key is being held down, but not on
      // first keydown. We don't need to process subsequent repeats of a keypress
      // we already processed.
      if (event.repeat) {
        return;
      }

      const shortcut = KeyboardShortcutParser.generateShortcutFromKeypress(event);
      const fixedShortcut = this.handleModifierKeypress(shortcut);

      if (this.currentKey === undefined) {
        this.currentKey = fixedShortcut;
      } else {
        // here's a fun fact. Keydown doesn't do modifier keys the way we want —
        // notably, A-Z0-9 keys are returned without modifier state (all modifiers)
        // are set to false in keydown events. That means we need to keep track of
        // modifiers ourselves.
        if (fixedShortcut.notModifier) {
          this.currentKey.key = fixedShortcut.key;
          this.currentKey.code = fixedShortcut.code;
        } else {
          this.currentKey = {
            ...fixedShortcut,
            key: this.currentKey.key,
            code: this.currentKey.code
          }
        }
      }

      // update display
      this.currentKeypress = KeyboardShortcutParser.parseShortcut(this.currentKey);
    },
    /**
     * Emits shortcutChanged when shortcut is considered changed
     */
    keyup(event) {
      const shortcut = KeyboardShortcutParser.generateShortcutFromKeypress(event);
      const fixedShortcut = this.handleModifierKeypress(shortcut);

      if (fixedShortcut.notModifier) {
        this.editing = false;
        this.$emit('shortcutChanged', this.currentKey);
      } else {
        // if none of the modifiers are pressed and if no other key is being held down,
        // we need to reset label back to 'pls press key'
        if (!fixedShortcut.altKey && !fixedShortcut.ctrlKey && !fixedShortcut.metaKey && !fixedShortcut.shiftKey && !fixedShortcut.code) {
          this.currentKeypress = undefined;
          this.currentKey = undefined;
        } else {
          this.currentKey = shortcut;
          this.currentKeypress = KeyboardShortcutParser.parseShortcut(this.currentKey);
        }
      }
    },

    /**
     * Handles current keypress if event.keyCode is a modifier key.
     * Returns true if current event was a modifier key, false if
     * if was a regular A-Z 0-9 key.
     */
    handleModifierKeypress(event) {
      const modifierPressed = event.type === 'keydown';

      switch (event.code) {
          case 'ShiftLeft':
          case 'ShiftRight':
            return {
              ...event,
              key: '…',
              code: null,
              shiftKey: modifierPressed
            }
          case 'ControlLeft':
          case 'ControlRight':
            return {
              ...event,
              key: '…',
              code: null,
              controlKey: modifierPressed
            };
          case 'MetaLeft':
          case 'MetaRight':
            return {
              ...event,
              key: '…',
              code: null,
              metaKey: modifierPressed
            };
          case 'AltLeft':
          case 'AltRight':
            return {
              ...event,
              key: '…',
              code: null,
              altKey: modifierPressed
            };
        }

        return {
          ...event,
          notModifier: true,
        }
    }

  }
}




</script>

<style lang="scss" src="../../csui/src/res-common/common.scss" scoped></style>
<style lang="scss" scoped>
@import "../../csui/src/res-common/variables";

.center-text {
  text-align: center;
}
.dark {
  opacity: 50%;
}

.hidden-input {
  position: absolute;
  z-index: -9999;
  opacity: 0;
}
</style>
