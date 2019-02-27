<template>
  <div class="">
    Values:
    <div class="window-content">
      <pre>{{action}}</pre>
      <pre>{{selectedAction}}</pre>
      <pre>{{selectedArgument}}</pre>

      <!-- ACTION SELECT -->
      <div class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            Select action:
          </span>
        </div>
        <div class="flex flex-grow flex-input">
          <select class=""
                  @change="setAction($event.target.value)"
          >
            <option v-for="(action, key) in ActionList"
                    :value="key"
                    :key="key"
            >
              {{action.name}}
            </option>
          </select>
        </div>
      </div>

      <!-- ARGUMENT SELECT -->
      <div v-if="selectedAction && ActionList[selectedAction]"
        class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            Select action parameter:
          </span>
        </div>
        <div class="flex flex-grow flex-input">
          <select class=""
                  @change="setArgument($event.target.value)"
          >
            <option v-for="(arg, key) of ActionList[selectedAction].args"
                    :key="key"
                    :value="key"
            >
              {{arg.name}}
            </option>
          </select>
        </div>
      </div>

      <!-- CUSTOM ARGUMENT INPUT -->
      <div v-if="selectedArgument && selectedArgument.customArg"
        class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            {{selectedArgument.name}}:
          </span>
        </div>
        <div class="flex flex-grow flex-input">
          <input type="text"
                  class="w100"
                  v-model="customArgumentValue"
          >
        </div>
      </div>

    </div>

    <div class="window-footer">
      <div class="button"
            @click="$emit('close-popup')"
      >
        Cancel
      </div>
      <div class="button"
            @click="emitCommand()"
      >
        Save
      </div>
    </div>
  </div>
</template>

<script>
import ActionList from '../../../ext/conf/ActionList';
import Stretch from '../../../common/enums/stretch.enum';

export default {
  data () {
    return {
      Stretch: Stretch,
      ActionList: ActionList,
      selectedAction: this.action ? action.action : undefined,
      selectedArgument: this.action ? {
        name: ActionList[action.action].args.find(x => x.arg === action.arg) || ActionList[action.action].args.find(x => x.customArg),
        arg: action.arg
      } : undefined,
      customArgumentValue: this.action ? action.arg : undefined
    }
  },
  created () {
    console.log("this.actionList", ActionList, this.ActionList)
    for(const a in ActionList) {
      console.log(a);
    }
  },
  props: {
    action: Object,
    scope: String,
  },
  methods: {
    setAction(cmd) {
      console.log("SETTING ACTION", cmd);
      this.selectedAction = cmd;
      this.selectedArgument = undefined;
      this.customArgumentValue = undefined;
    },
    setArgument(arg) {
      this.selectedArgument = ActionList[this.selectedAction].args[arg];
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