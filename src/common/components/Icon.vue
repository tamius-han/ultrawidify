<template>
  <svg class="bi" width="1em" height="1em" fill="currentColor">
    <use :xlink:href=" '' + iconHref" />
  </svg>
</template>

<script>
export default {
  props: {
    icon: String,
  },
  data() {
    return {
      bootstrapIconsBasePath: (browser ?? chrome).runtime.getURL('/res/icons/bootstrap-icons.svg'),
      iconHref: '',
    };
  },
  created() {
    this.iconHref = `${this.bootstrapIconsBasePath}#${this.icon}`;
  }
}
</script>

<style scoped>
</style>
