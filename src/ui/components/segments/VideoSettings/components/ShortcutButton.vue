<template>
  <button class="flex flex-col min-h-[3rem] justify-center items-center" :class="classList">
    <div class="flex justify-self-center">
      {{label}}
    </div>
    <div class="-mt-2 font-[0.8em] flex justify-self-center text-stone-500">
      {{shortcut ? `(${shortcut})` : ''}}
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    label: String,
    shortcut: String,
    classList: Object
  }
});
</script>
