<template>
  <div class="button center-text"
       :class="{
          'setting-selected': selected,
          'no-pad': noPad,
        }"
  >
    <mdicon v-if="icon" :name="icon" :size="iconSize ?? 24"></mdicon>
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
    iconSize: Number,
    noPad: Boolean
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
.no-pad {
  padding: 0.5rem 1rem !important;
}
</style>
