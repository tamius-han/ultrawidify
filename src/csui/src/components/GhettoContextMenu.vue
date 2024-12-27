<template>
  <div class="context-container" @mouseleave="hideContextMenu()">
    <GhettoContextMenuItem
      class="activator uw-clickable"
      :css="{
        'expand-left': alignment === 'left',
        'expand-right': alignment === 'right',
      }"
      @click="showContextMenu()"
      @mouseenter="showContextMenu()"
    >
      <slot name="activator"></slot>
    </GhettoContextMenuItem>
    <div
      v-if="contextMenuVisible"
      class="context-menu uw-clickable"
      :class="{
        'menu-left': alignment === 'left',
        'menu-right': alignment === 'right'
      }"
      @mouseleave="hideContextMenu()"
    >
      <slot></slot>
    </div>
  </div>

</template>
<script>
import GhettoContextMenuItem from './GhettoContextMenuItem.vue';

export default {
  components: {
    GhettoContextMenuItem,
  },
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
      this.contextMenuVisible = true;
    },
    hideContextMenu() {
      this.contextMenuHideTimeout = setTimeout( () => {
        this.contextMenuVisible = false;
      }, 50);
    }
  }
}
</script>
<style lang="scss" scoped>
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
<style lang="scss">
.activator {
  position: relative;
  padding: 1rem 1.6rem;

  font-size: .95rem;
  padding: 1rem 1.6rem;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px) saturate(120%);

  white-space: nowrap;
  &:hover {
    background-color: rgba(255, 128, 64, 0.5);
  }

  &.expand-left {
    padding-left: 2.2rem;
  }
  &.expand-right {
    padding-right: 2.2rem;
  }

  &.expand-left::before,
  &.expand-right::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.88rem;
  }

  &.expand-left::before {
    content: '⮜';
    left: 0.5rem;
  }
  &.expand-right::after {
    content: '⮞';
    right: 0.5rem;
  }
}
</style>
