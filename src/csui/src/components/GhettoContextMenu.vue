<template>
  <div class="context-container" @mouseleave="hideContextMenu()">
    <div class="activator"
      @click="showContextMenu()"
      @mouseenter="showContextMenu()"
    >
      <slot name="activator"></slot>
    </div>
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :class="{
          'menu-left': alignment === 'left',
          'menu-right': alignment !== 'left'
        }"
        @mouseleave="hideContextMenu()"
      >
        <slot></slot>
      </div>
  </div>

</template>
<script>

export default {
  props: {
    alignment: String,
  },
  data() {
    return {
      contextMenuVisible: false,
      contextMenuHideTimeout: undefined,
    }
  },
  methods: {
    showContextMenu() {
      console.log('will show context menu.')
      this.contextMenuVisible = true;
    },
    hideContextMenu() {
      this.contextMenuHideTimeout = setTimeout( () => {
        this.contextMenuVisible = false;
      }, 250);
    }
  }
}
</script>
<style>
.context-container {
  position: relative;
}
.context-menu-wrapper {
  position: relative;
}
.context-menu {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 5rem;

  top: 50%;
  transform: translateY(-50%);
}
.menu-left {
  right: 100%;
}
.menu-right {
  left: 100%;
}

</style>
