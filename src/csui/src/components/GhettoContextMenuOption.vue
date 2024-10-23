<template>
<div>
  <GhettoContextMenuItem>
    {{label}} {{shortcut ? `(${shortcut})` : ''}}
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
