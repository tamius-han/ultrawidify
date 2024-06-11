<template>
  <div class="block-main">
    <div class="button-main">
      <div class="button-action-display">
        {{ActionList[action.action].name}}:&nbsp;{{
          (ActionList[action.action].args.find(x => x.arg === action.arg) || action).arg
        }}
      </div>
      <div class="actions flex flex-row flex-center flex-cross-center">
        <div v-if="!first || true"
            class="flex order-button"
            @click="$emit('move-left')"
        >
          &lt;
        </div>
        <div class="flex flex-grow command-action"
             @click="$emit('delete')"
        >
          🗙
        </div>
        <div class="flex flex-grow command-action"
             @click="$emit('edit')"
        >
          🖉
        </div>
        <div v-if="!last || true"
            class="flex order-button"
            @click="$emit('move-right')"
        >
          &gt;
        </div>
      </div>
    </div>


  </div>
</template>


<script>
import ActionList from '../../../ext/conf/ActionList';

export default {
  data () {
    return {
      ActionList: ActionList,
    }
  },
  created () {
  },
  props: {
    action: Object,
    first: Boolean,
    last: Boolean
  },
  methods: {
    parseActionShortcut(action) {
      if (action.shortcut) {
        return KeyboardShortcutParser.parseShortcut(action.shortcut[0]);
      }
    },
    setAction(cmd) {
      this.selectedAction = cmd;
      this.selectedArgument = undefined;
      this.customArgumentValue = undefined;
    },
    setArgument(arg) {
      this.selectedArgument = arg;
      this.customArgumentValue = undefined;
    },
    // emitCommand() {
    //   this.$emit(
    //     'set-command',
    //     this.selectedAction,
    //     this.customArgumentValue ? this.customArgumentValue : this.selectedArgument.arg
    //   );
    // }
  }
}
</script>

<style lang="scss" scoped>
@import './../../../res/css/colors';

.block-main {
  border: 1px solid $primary-color;
  min-width: 10rem;
  padding-top: 0.1rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}

.button-action-display, .command-action, .order-button {
  display: block;
  padding-left: 1rem;
  padding-right: 1rem;
  text-align: center;
}
.button-action-display {
  padding-top: 0.1rem;
}

</style>
