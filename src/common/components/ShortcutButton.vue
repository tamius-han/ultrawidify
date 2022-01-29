<template>
  <div class="flex flex-column flex-center">
    <div class="flex flex-self-center">
      {{label}}
    </div>
    <div class="flex dark flex-self-center">
      <small>
        {{shortcut ? `(${shortcut})` : ''}}
      </small>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    shortcut: String
  }
}
</script>

<style lang="scss" scoped>
.center-text {
  text-align: center;
}
.dark {
  opacity: 50%;
}
</style>
