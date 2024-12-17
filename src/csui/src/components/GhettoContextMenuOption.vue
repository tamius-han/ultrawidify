<template>
<div>
  <GhettoContextMenuItem>
    <template v-if="label">
      {{label}} {{shortcut ? `(${shortcut})` : ''}}
    </template>
    <template v-else>
      <slot></slot>
    </template>
  </GhettoContextMenuItem>
  </div>
</template>

<script>
import GhettoContextMenuItem from './GhettoContextMenuItem.vue';

export default {
  components: {
    GhettoContextMenuItem,
  },
  props: {
    label: String,
    shortcut: String,
  }
}
</script>
