<template>
  <div v-if="popupVisible" class="popup">
    <div class="popup-window">
      <div
        class="header"
        :class="{
          'danger': dialogType === 'danger',
          'warning': dialogType === 'warning',
          'info': dialogType === 'info',
          'normal': dialogType === 'normal'
        }"
      >
        {{ dialogText || 'Confirm action' }}
      </div>
      <div class="body">
        {{ dialogText || 'Are you sure you want to do that?' }}
      </div>
      <div class="footer">
        <button
          class="button confirm"
          :class="{
            'danger': dialogType === 'danger',
            'warning': dialogType === 'warning',
            'info': dialogType === 'info',
            'normal': dialogType === 'normal'
          }"
          @click="confirmAction"
        >
          {{ confirmText || 'Confirm' }}
        </button>
        <button @click="popupVisible = false">{{ cancelText  || 'Cancel' }}</button>
      </div>
    </div>
  </div>
  <button @click="popupVisible = true">
    <slot></slot>
  </button>
</template>

<script>

export default {
  data() {
    return {
      popupVisible: false,
    }
  },
  props: [
    'dialogTitle',
    'dialogText',
    'confirmText',
    'cancelText',
    'dialogType'
  ],
  methods: {
    confirmAction() {
      this.$emit('onConfirmed');
    }
  }
}
</script>

<style lang="scss" scoped>
.popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: saturate(50%) backdrop-blur(1rem);
  z-index: 99999;

  .header {
    font-size: 1.33rem;
    color: #fff;
    background-color: #000;
  }
  .body {
    min-height: 5rem;
  }
}
</style>
