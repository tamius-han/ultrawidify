<template>
  <div class="block-main">

    <div v-if="!first"
         class="prev"
         @click="emit('move-left')"
    >
      &lt;
    </div>

    <div class="button-main">
      <div class="button-action-display">
        {{ActionList[action.action].name}}: {{
          ActionList[action.action].args.find(x => x.arg === action.arg) || action.arg
        }}
      </div>
      <div class="actions flex flex-row">
        <div class="flex flex-grow"
             @click="$emit('delete')"
        >
          🗙
        </div>
        <div class="flex flex-grow"
             @click="$emit('edit')"
        >
          🖉
        </div>
      </div>
    </div>

    <div v-if="!last"
         class="next"
         @click="$emit('move-right')"
    >
      &gt;
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
      return KeyboardShortcutParser.parseShortcut(action.shortcut[0]);
    },
    setAction(cmd) {
      console.log("SETTING ACTION", cmd);
      this.selectedAction = cmd;
      this.selectedArgument = undefined;
      this.customArgumentValue = undefined;
    },
    setArgument(arg) {
      console.log("SETTING ARGUMENT", cmd);
      this.selectedArgument = arg;
      this.customArgumentValue = undefined;
    },
    emitCommand() {
      this.$emit(
        'set-command',
        this.selectedAction,
        this.customArgumentValue ? this.customArgumentValue : this.selectedArgument.arg
      );
    }
  }
}
</script>