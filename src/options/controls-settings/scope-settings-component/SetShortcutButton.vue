<template>
  <div class="w100">
    <input type="text"
           class="shortcut-change-input"
           ref="input"
           :value="shortcutText"
           @focus="initiateKeypress"
           @keyup="processKeyup"
    />
    <span v-if="shortcut" @click="clearShortcut()">(Clear shortcut)</span>
  </div>
</template>

<script>
import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser'

export default {
  props: {
    shortcut: Array, // note: array in unlikely case we ever try to implement choords
    waitingForPress: false,
  },
  data() {
    return {
      shortcutText: '[click to add shortcut]'
    }
  },
  created(){
    if (this.shortcut && this.shortcut.length) {
      this.shortcutText = KeyboardShortcutParser.parseShortcut(this.shortcut[0]);
    }
  },
  methods: {
    initiateKeypress() {
      this.shortcutText = '[Press a key or key combination]';
      this.waitingForPress = true;
    },
    processKeyup(event) {
      if (this.waitingForPress) {
        const shortcut = {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          onKeyUp: true,
          onKeyDown: false,
        };
        this.$emit('set-shortcut', [shortcut])
        this.$refs.input.blur();
        this.shortcutText = KeyboardShortcutParser.parseShortcut(shortcut);
      }
      this.waitingForPress = false;
    },
    clearShortcut() {
      this.shortcutText = '[click to add shortcut]';
      this.shortcut = undefined;
      this.$emit('set-shortcut');
    }
  }
}
</script>

<style style="scss" scoped>
.shortcut-change-input {
  background-color: transparent;
  border: 0px solid transparent;
  text-align: center;
  width: 100%;
}
</style>
