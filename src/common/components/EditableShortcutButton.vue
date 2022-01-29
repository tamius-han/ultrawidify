<template>
  <div class="flex flex-column flex-center">
    <template v-if="!editing">
      <div class="flex flex-self-center">
        {{label}}
      </div>
      <div class="flex dark flex-self-center">
        <small>
          {{shortcut ? `(${shortcut})` : ''}}
        </small>
      </div>
    </template>
    <template v-else>
      <div class="flex flex-row flex-center">

      </div>
    </template>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    shortcut: String,
    editing: Boolean,
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
