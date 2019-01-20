<template>
  <div class="">
    <div class="window-content">

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
          <select @change="setArgument($event.target.value)">
            <option v-for="arg of ActionList[selectedAction].args"
                    :value="arg"
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
import StretchMode from '../../../common/enums/stretch.enum';

export default {
  data () {
    return {
      StretchMode: StretchMode,
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