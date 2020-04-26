<template>
  <div class="flex flex-column json-level-indent">
    <div class="flex flex-row" @click="expanded_internal = !expanded_internal">
      <div class="item-key-line">
        <template v-if="label">
          <b>
            <span class="item-key">"{{label}}"</span>
          :
          </b> 
        </template>
        <span v-if="!expanded_internal"><b> {</b> ... <b>}</b>,</span>
        <template v-else><b>{</b></template>
      </div>
    </div>
    <template v-if="expanded_internal">
      <div v-for="(row, rowKey) of value_internal"
          :key="rowKey"
      >
        <template v-if="(ignoreKeys || {})[rowKey] !== true">
          <JsonArray v-if="Array.isArray(row)"
                    :value="row"
                    :ignoreKeys="(ignoreKeys || {})[rowKey]"
                    @change="changeItem(rowKey, $event)"
          >
          </JsonArray>
          <JsonObject v-else-if="typeof row === 'object' && row !== null"
                      :value="row"
                      :label="rowKey"
                      :ignoreKeys="(ignoreKeys || {})[rowKey]"
                      @change="changeItem(rowKey, $event)"
          >
          </JsonObject>
          <JsonElement v-else
                      :value="row"
                      :label="rowKey"
                      @change="changeItem(rowKey, $event)"
          >
          </JsonElement>
        </template>
      </div>
      <div><b>},</b></div>
    </template>
  </div>
</template>

<script>
import JsonArray from './JsonArray';
import JsonElement from './JsonElement';

export default {
  name: 'JsonObject',
  props: [
    'value',
    'label',
    'expanded',
    'ignoreKeys',
  ],
  components: {
    JsonArray,
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