<template>
  <div class="root">
    <template v-for="key in json"
    >
      <div class="element" :key="key">
        <span class="json-key">"{{key}}"</span>:
          <template v-if="Array.isArray(json[key])">
            [<br/>
              <div v-for="index of json[key]"
                   class="json-table-row"
                   :key="index"
              >
              
              </div>
            ]
          </template>
      </div>
    </template>
  </div>
</template>
<script>
export default {
  name: "json-explorer",
  props: {
    json: Object
  }
}
</script>