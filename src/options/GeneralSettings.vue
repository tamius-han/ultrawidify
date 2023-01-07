<template>
  <div>
    this component is deprecated.
  </div>
</template>

<script>
import Button from '../common/components/Button';
import StretchType from '../common/enums/StretchType.enum';
import ExtensionMode from '../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../common/enums/VideoAlignmentType.enum';
import BrowserDetect from '../ext/conf/BrowserDetect';

export default {
  components: {
    Button,
  },
  props: {
    settings: Object
  },
  data () {
    return {

    }
  },
  created () {
  },
  methods: {

  }
}
</script>

<style lang="scss" scoped>
input[type="file"] {
    display: none;
}
</style>
