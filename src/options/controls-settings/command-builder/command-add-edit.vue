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
                  :value="selectedAction"
                  @change="setAction($event.target.value)"
          >
            <option :value="undefined" selected disabled>Select ...</option>
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
                  :value="selectedArgument ? selectedArgument.arg : undefined"
                  @change="setArgument($event.target.value)"
          >
            <option :value="undefined" selected disabled>Select ...</option>
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
    <pre>
    ----- [ COMMAND DATA ] -----
    
    :: Action:
    {{action}}

    :: Selected Action:
    {{selectedAction}}
    
    :: Selected Argumennt:
    {{selectedArgument}}
    --- [ END COMMAND DATA ] ---  
  </pre>

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
      selectedAction: undefined,
      selectedArgument: undefined,
      customArgumentValue: undefined
    }
  },
  created () {
    if (this.action) {
      this.selectedAction = this.action.cmd;
      this.selectedArgument = {
        name: ActionList[this.action.cmd].args.find(x => x.arg === this.action.arg) || ActionList[this.action.cmd].args.find(x => x.customArg),
        arg: this.action.arg
      }
      this.customArgumentValue = this.action.arg;
    }
    
    // console.log("this.actionList", ActionList, this.ActionList)
    // for(const a in ActionList) {
    //   console.log(a);
    // }
  },
  mounted() {
    
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