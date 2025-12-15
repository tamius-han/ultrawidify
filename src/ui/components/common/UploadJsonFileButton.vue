<template>
  <button
    class="button drop-zone"
    :class="[{'drag-over': isDragOver}, className]"
    @click="onClick"
    @dragover="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop="onDrop"
  >
    <slot></slot>
    <input type="file" ref="fileInput" @change="onFileChange" accept=".json" />
  </button>

</template>
<script lang="ts">
import { defineComponent } from 'vue';


export default defineComponent({
  props: {
    className: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      isDragOver: false
    };
  },
  methods: {
    onClick() {
      this.$refs.fileInput.click();
    },
    onDrop(event) {
      event.preventDefault();
      this.isDragOver = false;

      if (event.dataTransfer.files.length > 0) {
        this.handleFile(event.dataTransfer.files[0]);
      }
    },
    onFileChange(event) {
      if (event.target.files.length > 0) {
        this.handleFile(event.target.files[0]);
      }
    },
    handleFile(file) {
      if (file.type !== "application/json") {
        this.$emit('error', 'NOT_JSON_FILE');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedData = JSON.parse(event.target.result as string);
          this.$emit('importedJson', importedData);
        } catch (error) {
          this.$emit('error', 'INVALID_JSON');
        }
      };
      reader.readAsText(file);
    },
  }
});

</script>
<style lang="postcss" scoped>
input {
  display: none;
}
.drop-zone {
  &.drag-over {
    background-color: #fa6;
    color: black;
  }
}
</style>
