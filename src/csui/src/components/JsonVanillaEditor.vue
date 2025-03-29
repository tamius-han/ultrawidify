<template>
  <div ref="refContainer" class="w-full h-full"></div>
</template>

<script>
import { createJSONEditor } from "vanilla-jsoneditor";

export default {
  props: {
    modelValue: Object // v-model binding
  },
  emits: ["update:modelValue"],
  data() {
    return {
      refContainer: null,
      editor: null
    };
  },
  watch: {
    modelValue: {
      deep: true,
      handler(newValue) {
        if (this.editor) {
          this.editor.updateProps({ content: { json: newValue || {} } });
        }
      }
    }
  },
  mounted() {
    console.log('mounted:', this.refContainer, this.$refs.refContainer)
    if (this.$refs.refContainer) {
      this.editor = createJSONEditor({
        target: this.$refs.refContainer,
        props: {
          content: { json: this.modelValue || {} },
          onChange: (updatedContent) => {
            this.$emit("update:modelValue", updatedContent.json);
          }
        }
      });
    }
  },
  beforeUnmount() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }
};
</script>
<style>
:root {
  --jse-panel-background: #111;
  --jse-background-color: #000;
  --jse-text-color: #ccc;
  --jse-key-color: #8c8bef;
  --jse-selection-background-color: rgba(255, 171, 102, 0.177);
  --jse-context-menu-pointer-background: rgba(255, 171, 102, 0.177);
  --jse-delimiter-color: #fa6;

}


</style>
