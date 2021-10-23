<template>
  <div class="button center-text"
       :class="{'setting-selected': selected }"
  >
    <mdicon v-if="icon" :name="icon" class="icon" />
    <div class="label">
      {{label}}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    fixedWidth: Boolean,
    selected: Boolean,
    label: String,
    icon: String,
  }
}
</script>

<style lang="scss" scoped>
.button {
  display: flex;
  flex-direction: row;
  flex-wrap: none;

  align-items: center;

  .icon {
    margin-right: 8px;
    flex-grow: 0;
    flex-shrink: 0;
  }

  .label {
    text-align: center;
    flex-grow: 1;
    flex-shrink: 1;
  }

}
</style>
