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
            <option v-for="arg of ActionList[selectedAction].args"
                    :key="arg.arg"
                    :value="arg.arg"
            >
              {{arg.name}}
            </option>
          </select>
        </div>
      </div>

      <!-- CUSTOM ARGUMENT INPUT -->
      <div v-if="selectedArgument && selectedArgument.customArg">
        <div class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            {{selectedArgument.name}}:
          </span>
        </div>
        <div class="flex flex-grow flex-input">
          <input type="text"
                  class="w100"
                  :value="customArgumentValue"
                  @input="setCustomValue($event.target.value, selectedArgument.customSetter)"
          >
        </div>
        </div>
        <div class="flex flex-row">
          <div v-if="selectedArgument.hintHTML" v-html="selectedArgument.hintHTML">
          </div>
        </div>
      </div>

    </div>

    <div class="flex flex-row flex-end close-save-button-margin">
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
import StretchType from '../../../common/enums/StretchType.enum';

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
      this.selectedAction = this.action.action;
      this.selectedArgument = {
        name: ActionList[this.action.action].args.find(x => x.arg === this.action.arg) || ActionList[this.action.action].args.find(x => x.customArg),
        arg: this.action.arg
      }
      this.customArgumentValue = this.action.customArg;
    }
  },
  mounted() {
    
  },
  props: {
    action: Object,
    scope: String,
  },
  methods: {
    setAction(cmd) {
      this.selectedAction = cmd;
      this.selectedArgument = undefined;
      this.customArgumentValue = undefined;
    },
    setArgument(arg) {
      this.selectedArgument = ActionList[this.selectedAction].args.find(x => x.arg == arg);
      this.customArgumentValue = undefined;
    },
    setCustomValue(value, customSetter) {
      if (!customSetter) {
        this.customArgumentValue = value;
      } else {
        this.customArgumentValue = customSetter(value);
      }
    },
    emitCommand() {
      this.$emit(
        'set-command',
        this.selectedAction,
        this.selectedArgument.arg,
        this.customArgumentValue
      );
    }
  }
}
</script>

<style>
.form-label {
  width: 15rem;
  text-align: left;
  /* text-align: right; */
  vertical-align: baseline;
}

.close-save-button-margin {
  padding-top: 25px;
}

</style>
