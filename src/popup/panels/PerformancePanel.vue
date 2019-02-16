<template>
  <div>
    PERFORMANCE PANEL :: This is here for debugging purposes.

    <pre>{{performance}}</pre>
  </div>
</template>

<script>


export default {
  props: {
    performance: Object,
  },
  watch: {
    performance: {
      deep: true,
    }
  }
}
</script>

<style>

</style>
