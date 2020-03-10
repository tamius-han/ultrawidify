<template>
  <div class="flex flex-column">
    <div class="flex flex-row" @click="_expanded = !_expanded">
      <div v-if="_value.key" class="item-key">
        "{{_value.key}}" <b>:</b> 
        <span v-if="!_expanded"><b> [</b> ... <b>]</b>,</span>
        <template v-else><b>[</b></template>
      </div>
    </div>
    <div v-for="(row, key) of _value.value"
         :key="key"
    >
      <JsonArray v-if="Array.isArray(row)"
                 value="{'key': key', 'value': row}"
                 @change="changeItem(key, value)"
      >
      </JsonArray>
      <JsonObject v-else-if="typeof row === 'object' && row !== null"
                  value="{'key': key, 'value': row}"
                  @change="changeItem(key, value)"
      >
      </JsonObject>
      <JsonElement v-else
                   value="{'key': key, 'value': row}"
                   @change="changeItem(key, value)"
      >
      </JsonElement>
    </div>
    <div v-if="expanded"><b>],</b>
  </div>
</template>

<script>
import JsonObject from './JsonObject';
import JsonElement from './JsonElement';

export default {
  name: 'JsonArray',
  props: [
    'value',
    'expanded',
  ],
  components: {
    JsonObject,
    JsonElement,
  },
  data() {
    return {
      _value: undefined,
      _expanded: true,
    }
  },
  watch: {
    value: function(val) {
      this._value = val;
    },
    expanded: function(val) {
      if (val !== undefined && val !== null) {
        this._expanded = !!val;
      }
    }
  },
  methods: {
    changeItem(key, value) {
      this._value.value[key] = value;
      this.$emit('change', this._value.value);
    }
  }
}
</script>