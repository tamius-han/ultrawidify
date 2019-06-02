<template>
  <div class="button center-text flex" 
       :class="{'setting-selected': selected, 'w24': fixedWidth, 'flex-auto': !fixedWidth }"
       >
    {{label}}
  </div>
</template>

<script>
export default {
  props: {
    fixedWidth: Boolean,
    selected: Boolean,
    label: String,
  }
}
</script>
