<template>
  <div class="compact-form">
    <div class="field">
      <div class="label"></div>
      <div class="text-[0.9em] font-semibold">
        Add new ratio:
      </div>
    </div>
    <div class="field">
      <div class="label">Aspect ratio:</div>
      <div class="input">
        <input
          v-model="command.aspectRatio"
          placeholder="Enter aspect ratio ..."
          @blur="updateLabel()"
        >
      </div>
    </div>
    <div class="field">
      <div class="label">Label:</div>
      <div class="input">
        <input
          v-model="command.label"
          placeholder="Button label"
        >
      </div>
    </div>
    <div class="field">
      <div class="label">Shortcut:</div>
      <div class="hover-shortcut">
        <EditShortcutButton
          :command="command"
        ></EditShortcutButton>
      </div>
    </div>
    <div class="flex flex-row gap-1 justify-end -mt-2 text-[0.9em] text-stone-400 font-bold hover:font-bold">
      <div
        class="flex flex-row items-center px-2 py-1 hover:text-white cursor-pointer"
        :class="{'opacity-50 pointer-events-none': !command.aspectRatio || !command.label}"
        @click="add()"
      >
        <mdicon name="content-save" :size="16"></mdicon>
        Add
      </div>
      <div
        class="flex flex-row items-center px-2 py-1 hover:text-red-500 cursor-pointer"
        @click="cancel()"
      >
        <mdicon name="close" :size="16"></mdicon>
        Cancel
      </div>
    </div>
  </div>

</template>
<script lang="ts">
import { defineComponent } from 'vue';
import EditShortcutButton from './EditShortcutButton.vue';

export default defineComponent({
  components: {
    EditShortcutButton,
  },
  data() {
    return {
      command: {
        aspectRatio: '',
        label: '',
        shortcut: undefined as any,
      }
    }
  },
  methods: {
    updateLabel() {
      this.command.label = this.command.aspectRatio;
    },
    add() {
      console.log('emitting add', this.command);

      this.$emit('add', this.command);
    },
    cancel() {
      this.$emit('cancel');
    }
  }
});

</script>
<style lang="postcss" scoped>
@import './KeyboardShortcutEntry.css';

.compact-form {
  @apply flex flex-col gap-1;

  .field {
    @apply flex flex-row items-center gap-2 mx-0 my-0 px-0 py-0;

    .label {
      @apply w-24 text-right;
    }
    .input {
      @apply flex-1;
      input {
        @apply w-full placeholder:text-[0.8rem] placeholder:text-stone-500;
      }
    }
  }
}
</style>
