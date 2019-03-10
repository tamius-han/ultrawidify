<template>
  <div class="full-screen"
       @click="$emit('close')"
  >
    <div class="dialog-box flex flex-column" @click="$event.stopPropagation()">
      <div class="window-title">
        {{actionIndex < 0 ? 'Add new action' : 'Edit action'}}
      </div>

      <CommandChain class="w100"
                    :command="action.cmd"
                    @new-command="addNewCommand()"
                    @edit="editCommand"
                    @delete="deleteCommand"
      >
      </CommandChain>
      <CommandAddEdit class="w100"
                      v-if="addEditCommand"
                      :action="currentCmd"
                      @set-command="updateCommand"
                      @close-popup="addEditCommand=false"
      >
      </CommandAddEdit>

      <pre>
        ----- [ raw action data ] -----
        Action:
        {{action}}
        --- [ end raw action data ] ---
      </pre>

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
        <b>Show this action in the following tabs:</b>
      </div>

      <ScopeSettings :scopeOptions="globalScopeOptions"
                     @show="updateScopes('global', 'show', $event)"
                     @set-label="updateScopes('global', 'label', $event)"
                     @set-shortcut="updateScopes('global', 'shortcut', $event)"
      />
      <ScopeSettings :scopeOptions="siteScopeOptions"
                     @show="updateScopes('site', 'show', $event)"
                     @set-label="updateScopes('site', 'label', $event)"
                     @set-shortcut="updateScopes('site', 'shortcut', $event)"
      />
      <ScopeSettings :scopeOptions="pageScopeOptions"
                     @show="updateScopes('page', 'show', $event)"
                     @set-label="updateScopes('page', 'label', $event)"
                     @set-shortcut="updateScopes('page', 'shortcut', $event)"
      />

      
      
    </div>
  </div>
</template>

<script>
import Stretch from '../../common/enums/stretch.enum';
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import CommandChain from './command-builder/command-chain';
import CommandAddEdit from './command-builder/command-add-edit';
import ScopeSettings from './scope-settings-component/scope-settings';

export default {
  props: {
    settings: Object,
    actionIndex: Number,
  },
  components: {
    CommandChain: CommandChain,
    CommandAddEdit: CommandAddEdit,
    ScopeSettings,
  },
  data () {
    return {
      Stretch: Stretch,
      action: {
        name: 'New action',
        label: 'New action',
        cmd: [],
        scopes: {}
      },
      addEditCommand: false,
      currentCmdIndex: -1,
    }
  },
  created () {
  },
  computed: {
    globalScopeOptions: function() {
      return {
        show: this.action.scopes.global && this.action.scopes.global.show || false,
        label: (this.action.scopes.global && this.action.scopes.global.label) ? this.action.scopes.global.label : '',
        shortcut: this.action.scopes.global && this.action.scopes.global.shortcut
      }
    },
    siteScopeOptions: function() {
      return {
        show: this.action.scopes.site && this.action.scopes.site.show || false,
        label: (this.action.scopes.site && this.action.scopes.site.label) ? this.action.scopes.site.label : '',
        shortcut: this.action.scopes.site && this.action.scopes.site.shortcut
      }
    },
    pageScopeOptions: function() {
      return {
        show: this.action.scopes.page && this.action.scopes.page.show || false,
        label: (this.action.scopes.page && this.action.scopes.page.label) ? this.action.scopes.page.label : '',
        shortcut: this.action.scopes.page && this.action.scopes.page.shortcut
      }
    }
  },
  watch: {
    action: {
      deep: true,
    }
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
      if(!this.action.scopes[scope]) {
        this.action.scopes[scope] = {};
      }
      this.action.scopes[scope][prop] = value;

      // TODO: remove for release
      this.action = JSON.parse(JSON.stringify(this.action))
    },
    addNewCommand() {
      this.currentCmdIndex = -1;
      this.currentCmd = undefined;
      this.addEditCommand = true;
      console.log("adding command")
    },
    editCommand(index) {
      this.currentCmdIndex = index;
      this.currentCmd = this.action.cmd[index];
      this.addEditCommand = true;
      console.log("EDITING COMMAND")
    },
    deleteCommand(index) {
      this.action.cmd.splice(index,1);
    },
    updateCommand(action, arg) {
      this.addEditCommand = false;
      if (this.currentCmdIndex < 0) {
        this.action.cmd.push({
          cmd: action,
          arg: arg,
        });
      } else {
        this.action.cmd[this.currentCmdIndex] = {
          cmd: action,
          arg: arg,
        };
      }
      this.action = JSON.parse(JSON.stringify(this.action));

      // this.$nextTick(function() {this.$forceUpdate()});
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
