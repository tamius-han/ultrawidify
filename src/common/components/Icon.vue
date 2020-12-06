<template>
  <svg class="bi icon" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <use :xlink:href=" '' + iconHref" />
  </svg>
</template>

<script>
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  props: {
    icon: String,
  },
  data() {
    // note — webextension-polyfill is not gonna save us here.
    //        been there, tried that.
    return {
      bootstrapIconsBasePath: (BrowserDetect.firefox ? browser : chrome).runtime.getURL('/res/icons/bootstrap-icons.svg'),
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
  margin-left: 0.25em;
  margin-right: 0.25em;
}
</style>
