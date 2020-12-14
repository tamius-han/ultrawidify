<template>
  <div class="uw-hover uv-hover-trigger-region">
    TEST CONTENT
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';

export default {
  components: {
    Icon,
  },
  data() {
    return {
      uiVisible: true
    };
  },
  computed: {
    ...mapState([
      'showUi'
    ]),
  },
  watch: {
    showUi(visible) {
      if (visible !== undefined) {
        this.uiVisible = visible;
      }
    }
  },
  created() {
    console.log("created!");
    console.log("store:", this.$store, this);
  },
  methods: {
  }
}
</script>

<style lang="scss" src="../res/css/uwui-base.scss"></style>
<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
  .uw-hover {
    position: absolute;
    top: 20%;
    left: 20%;
    width: 100px;
    height: 100px;
    color: #fff;
    background-color: #000;
  }
  .uw-hover:hover {
    background-color: #f00;
  }
}


</style>