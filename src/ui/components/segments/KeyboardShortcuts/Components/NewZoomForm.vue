<template>
  <div class="compact-form">
    <div class="field">
      <div class="label"></div>
      <div class="text-[0.9em] font-semibold">
        Add zoom:
      </div>
    </div>
    <div class="field">
      <div class="label">Type:</div>
      <div class="select">
        <select v-model="command.type" @change="updateLabel()">
          <option value="relative">Change zoom by</option>
          <option value="fixed">Set zoom to</option>
        </select>
      </div>
    </div>
    <template v-if="!command.independentAxes">
      <div class="field">
        <div class="label">Zoom:</div>
        <div class="input">
          <input
            v-model="command.amountX"
            @blur="updateLabel()"
          >
        </div>
      </div>
    </template>
    <template v-else>
      <div class="field">
        <div class="label">Scale x:</div>
        <div class="input">
          <input
            v-model="command.amountX"
            @blur="updateLabel()"
          >
        </div>
      </div>
      <div class="field">
        <div class="label">Scale y:</div>
        <div class="input">
          <input
            v-model="command.amountY"
            @blur="updateLabel()"
          >
        </div>
      </div>
    </template>
    <div class="field">
      <div class="label"></div>
      <div>
        <input
          type="checkbox"
          v-model="command.independentAxes"
          @change="updateLabel()"
        > <span class="ml-2">Independent x/y</span>
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
        :class="{'opacity-50 pointer-events-none': !command.amountX || !command.amountY || isNaN(command.amountX) || isNaN(command.amountY) || !command.label}"
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
        label: '',
        type: 'relative',
        amountX: 1,
        amountY: 1,
        independentAxes: false,
        shortcut: undefined as any,
      }
    }
  },
  methods: {
    // if label ends with '%', parse it as a percentage
    parseLabel(axis: 'x' | 'y') {
      const a = axis === 'x' ? this.command.amountX : this.command.amountY;

      if (!a) {
        return;
      }

      if (typeof a === 'string' && (a as any as string).trim().endsWith('%')) {
        const p = (a as any as string).replace('%', '');
        return parseFloat(p) / 100;
      }
      return a;
    },

    updateLabel() {
      console.log('Updating label with command:', this.command);
      try {
        if (this.command.independentAxes) {
          console.log('Independent axes mode enabled');

          const x = this.parseLabel('x');
          const y = this.parseLabel('y');

          console.log('1: Parsed initial x and y:', x, y);

          if (x !== undefined && !isNaN(x)) {
            console.log('not undefined, not nan')
            this.command.amountX = +x;
          }
          console.log('02');
          if (y !== undefined && !isNaN(y)) {
            this.command.amountY = +y;
          }

          console.log('Parsed x and y:', x, y);

          if (x !== undefined && y !== undefined) {
            this.command.label = `x: ${this.command.type === 'relative' ? x < 0 ? '-' : '+' : ''}${x * 100}%;  y: ${this.command.type === 'relative' ? y < 0 ? '-' : '+' : ''}${y * 100}%`;
          } else if (x !== undefined) {
            this.command.label = `x: ${this.command.type === 'relative' ? x < 0 ? '-' : '+' : ''}${x * 100}%`;
          } else if (y !== undefined) {
            this.command.label = `y: ${this.command.type === 'relative' ? y < 0 ? '-' : '+' : ''}${y * 100}%`;
          }
        } else {
          const x = this.parseLabel('x');

          if (x !== undefined && !isNaN(x)) {
            this.command.label = `${this.command.type === 'relative' ? x < 0 ? '-' : '+' : ''}${x * 100}%`;

            this.command.amountX = +x;
            this.command.amountY = +x;
          }
        }

        this.$nextTick(() => {
          this.$forceUpdate();
        });
      }
      catch (e) {
        console.error('Error updating label:', e);
      }
    },
    add() {
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
    @apply flex flex-row flex-wrap items-center gap-2 mx-0 my-0 px-0 py-0;

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
