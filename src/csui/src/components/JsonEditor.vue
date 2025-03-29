<template>
  <div class="flex flex-row w-full">
    <button
      v-if="editorMode === 'tree'"
      @click="() => setEditorMode('text')"
    >
      Edit as text
    </button>
    <button
      v-else
      @click="() => setEditorMode('tree')"
    >
      Show as tree
    </button>
  </div>
  <div ref="refContainer" class="w-full h-full"></div>
</template>

<script>
import { createJSONEditor, Mode } from "vanilla-jsoneditor";

export default {
  props: {
    modelValue: Object // v-model binding
  },
  emits: ["update:modelValue"],
  data() {
    return {
      refContainer: null,
      editor: null,
      editorMode: Mode.tree,
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
    if (this.$refs.refContainer) {
      this.editor = createJSONEditor({
        target: this.$refs.refContainer,
        props: {
          mode: Mode.tree,
          content: { json: this.modelValue || {} },
          onChange: (updatedContent) => {
            this.$emit("update:modelValue", updatedContent.json);
          },
          onRenderContextMenu: false,
          navigationBar: false,
          statusBar: false,
          mainMenuBar: false
        }
      });
    }
  },
  methods: {
    setEditorMode(mode) {
      this.editorMode = mode
      this.editor.updateProps({ mode });
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
<style lang="scss">
:root {
  --jse-panel-background: #111;
  --jse-background-color: #000;
  --jse-text-color: #ccc;
  --jse-key-color: #8c8bef;
  --jse-selection-background-color: rgba(255, 171, 102, 0.177);
  --jse-context-menu-pointer-background: rgba(255, 171, 102, 0.177);
  --jse-delimiter-color: #fa6;
  --jse-value-color-boolean: rgb(132, 132, 137);
}

.jse-boolean-toggle[role="checkbox"] {
  &[aria-checked="true"] {
    color: rgb(218, 244, 238);
  }

  &[aria-checked="false"] {
    border: 0px transparent;
    outline: 0px transparent;
    color: rgb(241, 107, 25);
    background-color: rgb(241, 107, 25);

    position: relative;

    &:after {
      position: absolute;

      content: '×';

      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      color: black;

      text-align: center;
      font-weight: bold;

    }
  }
}

</style>
