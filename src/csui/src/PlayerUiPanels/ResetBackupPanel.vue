<template>
<div class="flex flex-col">
  <h1>Reset and backup</h1>
  <p>
    Pressing the button will reset settings to default without asking.
  </p>
  <button
    class="danger"
    @click="resetSettings"
  >
    Reset settings
  </button>
</div>
</template>
<script>
export default {
  props: {
    settings: Object
  },
  methods: {
    resetSettings() {
      this.settings.active = JSON.parse(JSON.stringify(this.settings.default));
      this.settings.saveWithoutReload();
    }
  }
}
</script>
<style lang="scss" src="../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>
