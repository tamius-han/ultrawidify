<template>
  <div class="keyboard-shortcut-row">
    <div class="w-[12em] text-stone-300">
      <span v-if="indent" :style="{width: indent + 'rem'}" class="inline-block"></span>{{command.label}}
    </div>
    <div class="w-[18em] flex flex-row items-center">
      <EditShortcutButton
        :settings="settings"
        :command="command"
      >
      </EditShortcutButton>
    </div>
    <div v-if="state !== 'removing'" class="justify-self-end cursor-pointer hover-show flex flex-row items-center text-[0.8em]" @click="clearShortcut(command)">
      <mdicon class="text-red-500" name="close" :size="12"></mdicon> <span class="pl-1">Clear</span>
    </div>
    <div v-if="removable && state !== 'removing'" class="justify-self-end text-red-500 cursor-pointer hover-show flex flex-row items-center text-[0.8em]" @click="removeAction(command)">
      <mdicon name="delete" :size="12"></mdicon> <span class="pl-1">Remove action</span>
    </div>
    <div v-if="state === 'removing'" class="justify-self-end flex flex-row items-center gap-2 text-[0.8em]">
      <div>Remove option?</div>
      <div @click="cancelRemoval()" class="cursor-pointer flex flex-row items-center gap-1">
        <mdicon name="close" :size="12"></mdicon> <span>No, do not remove</span>
      </div>
      <div @click="confirmRemoval(command)" class="cursor-pointer text-red-500 flex flex-row items-center gap-1">
        <mdicon name="remove" :size="12"></mdicon> <span>Yes</span>
      </div>
    </div>
  </div>

</template>
<script lang="ts">
import { defineComponent } from 'vue';
import KeyboardShortcutParserMixin from '@ui/utils/mixins/KeyboardShortcutParserMixin.vue';
import EditShortcutButton from './EditShortcutButton.vue';

export default defineComponent({
  components: {
    EditShortcutButton,
  },
  mixins: [
    KeyboardShortcutParserMixin
  ],
  props: [
    'settings', // not used — only passed on
    'command',
    'type',
    'indent',
    'removable',
  ],
  data() {
    return {
      state: null,
    }
  },
  methods: {
    clearShortcut(command) {
      command.shortcut = undefined;
      this.settings.saveWithoutReload();
    },
    removeAction(command) {
      if (!this.removable) {
        return;
      }
      this.state = 'removing';
    },
    confirmRemoval(command) {
      console.info('confirmong removal:', command)
      const commandsArray = this.settings.active.commands[this.type];
      let index = commandsArray.indexOf(command);
      let reload = false;
      // let's try fallback
      if (index === -1) {
        index = commandsArray.findIndex(x => JSON.stringify(x) === JSON.stringify(command))
        reload = true;
      }
      console.log('command index:', index, this.settings.active.commands[this.type]);
      if (index !== -1) {
        commandsArray.splice(index, 1);
        if (reload) {
          this.settings.save();
        } else {
          this.settings.saveWithoutReload();
        }
      }

      this.state = null;
    },
    cancelRemoval() {
      this.state = null;
    }

  }
});
</script>
<style lang="postcss" scoped>
@import './KeyboardShortcutEntry.css';
</style>
