<template>
  <div class="flex flex-column json-level-indent">
    <div class="flex flex-row" @click="expanded_internal = !expanded_internal">
      <div v-if="value_internal.key" class="item-key">
        "{{value_internal.key}}" <b>:</b> 
        <span v-if="!expanded_internal"><b> [</b> ... <b>]</b>,</span>
        <template v-else><b>[</b></template>
      </div>
    </div>
    <div v-for="(row, key) of value_internal.value"
         :key="key"
    >
      <JsonArray v-if="Array.isArray(row)"
                  :value="row"
                  :ignoreKeys="ignoreKeys"
                  @change="changeItem(rowKey, $event)"
      >
      </JsonArray>
      <JsonObject v-else-if="typeof row === 'object' && row !== null"
                  :value="row"
                  :label="rowKey"
                  :ignoreKeys="ignoreKeys"
                  @change="changeItem(rowKey, $event)"
      >
      </JsonObject>
      <JsonElement v-else
                  :value="row"
                  :label="rowKey"
                  @change="changeItem(rowKey, $event)"
      >
      </JsonElement>
    </div>
    <div v-if="expanded_internal"><b>],</b></div>
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
    'ignoreKeys', // this prop is passthrough for JsonArray
  ],
  components: {
    JsonObject,
    JsonElement,
  },
  data() {
    return {
      value_internal: undefined,
      expanded_internal: true,
    }
  },
  created() {
    this.value_internal = this.value;
  },
  watch: {
    value: function(val) {
      this.value_internal = val;
    },
    expanded: function(val) {
      if (val !== undefined && val !== null) {
        this.expanded_internal = !!val;
      }
    }
  },
  methods: {
    changeItem(key, value) {
      this.value_internal[key] = value;
      this.$emit('change', this.value_internal);
    }
  }
}
</script>

<style lang="scss" scoped src="./json.scss">
</style>
<style lang="scss" scoped src="../../../res/css/flex.scss">
</style>
