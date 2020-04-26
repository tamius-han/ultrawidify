<template>
  <div class="flex flex-row json-level-indent">
    <div>
      <b>
        <span v-if="label" class="item-key" 
                           :class="{'item-key-boolean-false': typeof value_internal === 'boolean' && !value_internal}"
        >
          "{{label}}"
        </span>
        :&nbsp;
      </b>
    </div>
    <div v-if="typeof value_internal === 'boolean'"
         :class="{'json-value-boolean-true': value_internal, 'json-value-boolean-false': !value_internal}"
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
      <template v-if="typeof value_internal === 'string'">
        "<div ref="element-edit-area"
              contenteditable="true"
              @keydown.enter="changeValue"
        >
          {{value_internal}}
        </div>"
      </template>
      <template v-else>
        <div ref="element-edit-area"
              contenteditable="true"
              @keydown.enter="changeValue"
        >
          {{value_internal}}
        </div>
      </template>,
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
      this.$refs['element-edit-area'].blur();
      const newValue = this.$refs['element-edit-area'].textContent.replace(/\n/g, '');
      if (isNaN(newValue)) {
        this.value_internal = newValue;
        this.$emit('change', newValue);
      } else {
        this.value_internal = +newValue;
        this.$emit('change', +newValue);
      }
      this.editing = false;
    }
  }
}
</script>

<style lang="scss" scoped src="./json.scss">
</style>
