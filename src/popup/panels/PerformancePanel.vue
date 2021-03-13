<template>
  <div>
    PERFORMANCE PANEL :: This is here for debugging purposes.

    <pre>{{performance}}</pre>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    performance: Object,
  },
  watch: {
    performance: {
      deep: true,
    }
  }
})
</script>

<style>

</style>
