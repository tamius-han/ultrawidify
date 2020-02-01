<template>
  <div v-if="showLoggerUi">
    <div>
      <div>DEFORESTATOR 5000</div>
      <div>Iron Legion's finest logging tool</div>
    </div>
    <div>
      <div>
        logger config panel is here
      </div>
      <div class="test-class">
        logger results will go here
      </div>
    </div>
    <div>
      button row is here
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showLoggerUi: true,
      ghettoCss: {
        
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import url('../res/css/colors.scss');
@import url('../res/css/font/overpass.css');
@import url('../res/css/font/overpass-mono.css');
@import url('../res/css/common.scss');
@import url('../res/css/flex.css');

.rootWindow {
  position: fixed !important;
  top: 5vh !important;
  left: 5vw !important;
  width: 90vw !important;
  height: 90vh !important;
  z-index: 999999 !important;
  background-color: rgba(18,17,15,0.9) !important;
  color: #f1f1f1 !important;
  font-size: 14px !important;
}

</style>
