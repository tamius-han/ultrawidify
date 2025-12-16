<template>
  <div
    v-if="title"
    class="popup-overlay"
    :class="{'dim': dimOverlay}"
  >
    <div class="popup-content p-4 border border-stone-700 max-h-[90dvh] max-w-[90dvw]" >
      <div class="h-full flex flex-col w-full">
        <div v-if="title" class="header grow-0 shrink-0" :class="type">
          <h3 class="mb-4 mt-0">{{title}}</h3>
        </div>
        <p v-if="message">
          {{ message }}
        </p>
        <div v-else class="h-full w-full -mr-4 pr-4 grow shrink overflow-y-auto overflow-x-hidden">
          <slot></slot>
        </div>
        <div class="grow-0 shrink-0 flex row gap-2 justify-end w-full">
          <button
            class="primary"
            v-if="confirmButtonText"
            :class="type"
            @click="$emit('onConfirm')"
          >
            {{ confirmButtonText }}
          </button>
          <button
            :class="type"
            @click="$emit('onCancel')"
          >
            {{ cancelButtonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: {
    // onConfirm: {
    //   type: Function,
    //   required: false
    // },
    // onCancel: {
    //   type: Function,
    //   default: () => this.$emit('close')
    // },
    title: {
      type: String,
      required: false
    },
    message: {
      type: String,
      required: false, // technically prolly should be true, but we don't have to guard against skill issue
    },
    dimOverlay: {
      type: Boolean,
      default: true
    },
    type: {
      type: String,
      default: 'info'
    },
    confirmButtonText: {
      type: String,
      required: false,
    },
    cancelButtonText: {
      type: String,
      default: 'Cancel'
    }
  }
}
</script>
<style lang="postcss" scoped>

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  width: 100%;
  height: 100%;

  backdrop-filter: saturate(50%) brightness(50%) blur(1rem);
  z-index: 99999;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .header {
    font-size: 1.33rem;

    color: #fff;

    &.danger {
      color: rgb(251, 107, 63);
      font-weight: bold;
    }
  }
  .body {
    min-height: 5rem;
  }
}
</style>
