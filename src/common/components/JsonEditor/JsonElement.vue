<template>
  <div class="flex flex-row json-level-indent">
    <div>
      <b>
        <span v-if="label" class="item-key">"{{label}}" </span>
        :
      </b>
    </div>
    <div v-if="typeof value_internal === 'boolean'"
         class="json-value-boolean"
         @click="toggleBoolean"
    >
      <template v-if="value_internal">true</template>
      <template v-else>false</template>
    </div>
    <div v-else
        class="flex flex-row inline-edit"
        :class="{
          'json-value-number': typeof value_internal === 'number',
          'json-value-string': typeof value_internal === 'string'
        }"
    >
      <template v-if="editing">
        <div ref="element-edit-area"
             :contenteditable="editing"
        >
          {{value_internal}}
        </div>
        <div class="btn" @click="changeValue">
          ✔
        </div>
      </template>
      <template v-else>
        <template v-if="typeof value_internal === 'string'">
          "{{value_internal}}"
        </template>
        <template v-else>
          {{value_internal}}
        </template>,
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'json-element',
  props: [
    'value',
    'label',
  ],
  data() {
    return {
      value_internal: undefined,
      editing: false,
    }
  },
  created() {
    this.value_internal = this.value;
  },
  watch: {
    value: function(val) {
      this.value_internal = val;
    }
  },
  methods: {
    toggleBoolean() {
      this.value_internal = !this.value_internal;
      this.$emit('change', this.value_internal);
    },
    changeValue() {
      const newValue = this.$refs['element-edit-area'].textContent;
      if (isNaN(newValue)) {
        this.value_internal = newValue;
        this.$emit('change', newValue);
      } else {
        this.value_internal.value = +newValue;
        this.$emit('change', +newValue);
      }
      this.editing = false;
    }
  }
}
</script>

<style lang="scss" scoped>
@import url('./json.scss');
</style>
