<template>
  <svg class="bi icon" width="1em" height="1em" fill="currentColor">
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
.icon {
  margin-left: 1em;
  margin-right: 1em;
}
</style>
