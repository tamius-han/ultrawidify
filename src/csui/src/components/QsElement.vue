<template>
  <div class="qsb flex flex-row flex-cross-center flex-center flex-nogrow"
  :class="{
    'id': selector.startsWith('#'),
    'class': selector.startsWith('.'),
  }">
    <div class="flex mt2px">{{selector}}</div> <span class="flex closeButton" @click="remove">×</span>
  </div>
</template>

<script>
export default {
  props: {
    selector: String,
  },
  methods: {
    remove() {
      this.$emit('remove');
    }
  }
}
</script>

<style lang="scss" scoped>
.mt2px {
  margin-top: 7px;
}
.id {
  border: 1px solid #d00;
  background-color: rgba(216, 94, 24, 0.25)
}
.class {
  border: 1px solid #33d;
  background-color: rgba(69, 69, 255, 0.25)
}
.closeButton {
  margin-top: 2px;
  margin-left: 4px;
  margin-right: 4px;
  font-size: 1.5em;
  color: #e00;
}
.closeButton:hover {
  cursor: pointer;
  color: #fa6;
}
.qsb {
  cursor:default;
  margin-left: 3px;
  margin-right: 3px;
  margin-bottom: 2px;
}
</style>
