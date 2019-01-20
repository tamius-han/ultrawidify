<template>
  <div class="full-screen"
       @click="$emit('close')"
  >
    <div class="dialog-box flex flex-column" @click="$event.stopPropagation()">
      <div class="window-title">
        {{actionIndex < 0 ? 'Add new action' : 'Edit action'}}
      </div>

      <CommandChain class="w100"
                    :command="action.command"
                    @new-command="addNewCommand()"
      >
      </CommandChain>
      <CommandAddEdit class="w100"
                      v-if="addEditCommand"
                      :command="currentCmd"
      >
      </CommandAddEdit>

      <div class="flex flex-column">
        <div class="flex flex-row">
          <div class="flex label-secondary form-label">
            <span class="w100">
              Action name:
            </span>
          </div>
          <div class="flex flex-input flex-grow">
            <input type="text"
                  class="w100"
                  :value="actionIndex < 0 ? action.name : settings.active.actions[actionIndex].name"
                  @input="updateActionName($event.target.value)"
                  >
          </div>
        </div>
        <div class="flex flex-row">
          <div class="flex label-secondary form-label">
            <span class="w100">
              Default label:
            </span>
          </div>
          <div class="flex flex-input flex-grow">
            <input type="text"
                   class="w100"
                   :value="actionIndex < 0  ? action.label : settings.active.actions[actionIndex].label"
                   @input="updateActionLabel($event.target.value)"
                  >
          </div>
        </div>

      </div>

      <div class="flex flex-row">
        <b>Scopes:</b>
      </div>

      <div class="flex flex-row">
        Global:
      </div>

      <div class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            Show in popup
          </span>
        </div>
        <div class="flex flex-input">
          <input type="checkbox"
                 :value="actionIndex < 0  ? true : settings.active.actions[actionIndex].scopes.global && settings.active.actions[actionIndex].scopes.global.show"
                 @input="updateScopes('global', 'show', $event.target.value)"
          >
        </div>
      </div>
      <div class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            Label <span class="hint"><small>(leave empty for default)</small></span>:
          </span>
        </div>
        <div class="flex flex-input flex-grow">
          <input type="text"
                 class="w100"
                 @input="updateScopes('global', 'label', $event.target.value)"
                 >
        </div>
      </div>
      <div class="flex flex-row">
        <div class="flex label-secondary form-label">
          <span class="w100">
            Shortcut:
          </span>
        </div>
        <div class="flex flex-input flex-grow">
          TODO: insert shortcut changing component
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StretchMode from '../../common/enums/stretch.enum';
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import CommandChain from './command-builder/command-chain';
import CommandAddEdit from './command-builder/command-add-edit';

export default {
  components: {
    CommandChain: CommandChain,
    CommandAddEdit: CommandAddEdit,
  },
  data () {
    return {
      StretchMode: StretchMode,
      action: {
        name: 'New action',
        label: 'New action',
        cmd: [],
      },
      addEditCommand: false,
      currentCmd: {},
    }
  },
  created () {
  },
  props: {
    settings: Object,
    actionIndex: Number,
  },
  methods: {
    parseActionShortcut(action) {
      return KeyboardShortcutParser.parseShortcut(action.shortcut[0]);
    },
    parseCommand(cmd) {
      let cmdstring = '';
      for(const c of cmd) {
        cmdstring += `${c.action} ${c.arg}${c.persistent ? ' persistent' : ''}; `;
      }
      return cmdstring;
    },
    updateActionName(newName) {
      this.action.name = newName;
    },
    updateActionLabel(newLabel) {
      this.action.label = newLabel;
    },
    updateScopes(scope, prop, value) {

    },
    addNewCommand() {
      this.currentCmd = {};
      this.addEditCommand = true;
    }
  }
}
</script>

<style lang="scss" scoped>

.full-screen {
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-items: center;
  width: 100%;
  height: 100%;
  position: absolute;
}

.dialog-box {
  background-color: rgba(0,0,0,0.9);
  // width: 100%;
  // height: 100%;
  max-width: 130rem;
  max-height: 42rem;
  padding-top: 2rem;
  padding-left: 3rem;
  padding-right: 3rem;
}

.window-title {
  font-size: 2.4rem;
  font-variant: small-caps;
  margin-bottom: 1.69rem;
}

.form-label {
  width: 16rem;
  text-align: right;
  vertical-align: baseline;
}


.hint {
  opacity: 50% !important;
  font-weight: 300;
}

.w100 {
  width: 100%;
}


</style>
