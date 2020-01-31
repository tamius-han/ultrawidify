<template>
  <div v-if="showLoggerUi" :style="[ghettoCss.rootWindow, ghettoCss.flexColumn]">
    <div :style="ghettoCss.header">
      <div :style="ghettoCss.headerTop">DEFORESTATOR 5000</div>
      <div :style="[ghettoCss.headerBottom]">Iron Legion's finest logging tool</div>
    </div>
    <div :style="[ghettoCss.flexRow, ghettoCss.flexGrow, ghettoCss.content]">
      <div :style="[ghettoCss.flexColumn, ghettoCss.configPanel]">
        logger config panel is here
      </div>
      <div :style="[ghettoCss.flexColumn, ghettoCss.logPanel]">
        logger results will go here
      </div>
    </div>
    <div :style="[ghettoCss.content, ghettoCss.buttonRow]">
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
        rootWindow: {
          position: 'fixed',
          top: '5vh',
          left: '5vw',
          width: '90vw',
          height: '90vh',
          zIndex: '999999', 
          backgroundColor: 'rgba(18,17,15,0.9)',
          color: '#f1f1f1',
          fontSize: '14px',
        },
        header: {
          width: '100%',
          color: '#ffffff',
          backgroundColor: '#811',
          flexGrow: '0',
          flexShrink: '0',
        },
        headerTop: {
          width: '100%',
          fontSize: '42px',
          paddingLeft: '32px',
          paddingTop: '8px',
        },
        headerBottom: {
          // width: '100%',
          fontSize: '18px',
          paddingLeft: '32px',
          paddingTop: '8px',
          paddingBottom: '6px',
          backgroundColor: '#322',
        },
        flexColumn: {
          display: 'flex',
          flexDirection: 'column',
        },
        flexRow: {
          display: 'flex',
          flexDirection: 'row',
        },
        flexGrow: {
          flexGrow: 1,
        },
        configPanel: {
          flexGrow: 1,
          padddingRight: '8px',
        },
        logPanel: {
          flexGrow: 2,
          padddingRight: '8px',
        },
        content: {
          padding: '16px',
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// scss no worky

</style>
