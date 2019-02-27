<template>
  <div class="w100">
    <input type="text"
           :value="shortcutText"
           @focus="initiateKeypress"
           @keyup="processKeyup"
    />

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
    if (shortcut) {
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
        console.log("PROCESSING KEY UP", event)
        $emit('set-shortcut', {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          onKeyUp: true,
          onKeyDown: false,
        });
      }
      this.waitingForPress = false;
    }
  }
}
</script>

<style>

</style>
