<template>
  <div
    class="flex flex-col flex-center center-text item"
    :class="{
      'can-hover': !disableHover,
      ...(css ? css : {}),
    }"
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  props: {
    label: String,
    shortcut: String,
    childAlignment: String,
    css: Object,
    disableHover: Boolean,
  }
}
</script>

<style lang="scss" scoped>
.item {
  position: relative;
  font-size: .95rem;
  font-family: 'Overpass';
  padding: 1rem 1.6rem;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(16px) saturate(120%);

  white-space: nowrap;

  &.can-hover:hover {
    background-color: rgba(0,0,0,0.98);
    border-bottom: 1px solid #fa6;
  }

  display: flex;
  flex-direction: column;
}


</style>
