<template>
  <div class="w100">
    <input type="text"
           class="shortcut-change-input"
           ref="input"
           :value="shortcutText"
           @focus="initiateKeypress"
           @keyup="processKeyup"
    />
    <span v-if="shortcut" @click="$emit('set-shortcut')">(Clear shortcut)</span>
  </div>
</template>

<script>
import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser'

export default {
  props: {
    shortcut: Object,
    waitingForPress: false,
  },
  data() {
    return {
      shortcutText: '[click to add shortcut]'
    }
  },
  created(){
    if (this.shortcut) {
      this.shortcutText = KeyboardShortcutParser.parseShortcut(shortcut);
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
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          onKeyUp: true,
          onKeyDown: false,
        };
        this.$emit('set-shortcut', shortcut)
        this.$refs.input.blur();
        this.shortcutText = KeyboardShortcutParser.parseShortcut(shortcut);
      }
      this.waitingForPress = false;
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
