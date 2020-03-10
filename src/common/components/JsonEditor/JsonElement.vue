<template>
  <div class="flex flex-row">
    <div v-if="_value.key" class="item-key">
      "{{_value.key}}" <b>:</b>
    </div>
    <div v-if="typeof _value.value === 'boolean'"
         class="json-value-boolean"
         @click="toggleBoolean"
    >
      <template v-if="_value.value">true</template>
      <template v-else>false</template>
    </div>
    <div v-else
        class="flex flex-row inline-edit"
        :class="{
          'json-value-number': typeof _value.value === 'number',
          'json-value-string': typeof _value.value === 'string'
        }"
    >
      <template v-if="editing">
        <div ref="element-edit-area"
             :contenteditable="editing"
        >
          {{_value.value}}
        </div>
        <div class="btn" @click="changeValue">
          ✔
        </div>
      </template>
      <template v-else>
        <template v-if="typeof _value.value === 'string'">
          "{{_value.value}}"
        </template>
        <template v-else>
          {{_value.value}}
        </template>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'json-element',
  props: [
    'value',
  ],
  data() {
    return {
      _value: undefined,
      editing: false,
    }
  },
  watch: {
    value: function(val) {
      this._value = val;
    }
  },
  methods: {
    toggleBoolean() {
      this._value.value = !this._value.value;
      this.$emit('change', this._value.value);
    },
    changeValue() {
      const newValue = this.$refs['element-edit-area'].textContent;
      if (isNaN(newValue)) {
        this._value.value = newValue;
        this.$emit('change', newValue);
      } else {
        this._value.value = +newValue;
        this.$emit('change', +newValue);
      }
      this.editing = false;
    }
  }
}
</script>