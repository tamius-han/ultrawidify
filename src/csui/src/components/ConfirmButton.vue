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
        <button class="button" @click="popupVisible = false">{{ cancelText  || 'Cancel' }}</button>
      </div>
    </div>
  </div>
  <button
    :class="[
      {
        'danger': dialogType === 'danger',
        'warning': dialogType === 'warning',
      },
      btnClass
    ]"
    @click="popupVisible = true"
  >
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
    'btnClass',
    'dialogTitle',
    'dialogText',
    'confirmText',
    'cancelText',
    'dialogType'
  ],
  methods: {
    confirmAction() {
      this.popupVisible = false;
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
