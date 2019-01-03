<template>
  <div class="flex flex-column">
    <div class="flex w100">
      {{label}}
    </div>
    <div class="flex w100 dark">
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

<style>
.dark {
  opacity: 50%;
}
</style>
