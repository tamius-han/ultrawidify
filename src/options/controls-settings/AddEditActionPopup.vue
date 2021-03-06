<template>
  <div class="full-screen"
       @click="cancel()"
  >
    <div class="dialog-box flex flex-column" @click="$event.stopPropagation()">
      <div class="window-title">
        {{actionIndex < 0 ? 'Add new action' : 'Edit action'}}
      </div>

      <div class="command-chain-border">
        <CommandChain class="w100"
                      :command="action.cmd"
                      @new-command="addNewCommand()"
                      @edit="editCommand"
                      @delete="deleteCommand"
        >
        </CommandChain>
        <CommandAddEdit class="w100 cae-margin"
                        v-if="addEditCommand"
                        :action="currentCmd"
                        @set-command="updateCommand"
                        @close-popup="addEditCommand=false"
        >
        </CommandAddEdit>
      </div>

      <div class="flex flex-column section-pad">
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

      <div class="flex flex-row section-pad">
        <b>Show this action in the following tabs:</b>
      </div>

      <template v-if="action && action.cmd[0] && action.cmd[0].action !== 'set-ar'">
        <div class="tab-title">Extension settings (global)</div>
        <ScopeSettings :scopeOptions="globalScopeOptions"
                      @show="updateScopes('global', 'show', $event)"
                      @set-label="updateScopes('global', 'label', $event)"
                      @set-shortcut="updateScopes('global', 'shortcut', $event)"
        />
      </template>

      <template v-if="action && action.cmd[0] && action.cmd[0].action !== 'set-ar'">
        <div class="tab-title">Site settings (site)</div>
        <ScopeSettings :scopeOptions="siteScopeOptions"
                      @show="updateScopes('site', 'show', $event)"
                      @set-label="updateScopes('site', 'label', $event)"
                      @set-shortcut="updateScopes('site', 'shortcut', $event)"
        />
      </template>

      <div class="tab-title">Video settings (page)</div>
      <ScopeSettings :scopeOptions="pageScopeOptions"
                     @show="updateScopes('page', 'show', $event)"
                     @set-label="updateScopes('page', 'label', $event)"
                     @set-shortcut="updateScopes('page', 'shortcut', $event)"
      />

      <div class="flex flex-row flex-end">
        <ShortcutButton class="flex b3 button"
                        label="Save"
                        @click.native="saveSettings()"
        />
        <ShortcutButton class="flex b3 button"
                        label="Cancel"
                        @click.native="cancel()"
        />
      </div>
      
    </div>
  </div>
</template>

<script>
import ShortcutButton from '../../common/components/ShortcutButton.vue' 
import StretchType from '../../common/enums/StretchType.enum';
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import CommandChain from './command-builder/CommandChain';
import CommandAddEdit from './command-builder/CommandAddEdit';
import ScopeSettings from './scope-settings-component/ScopeSettings';

export default {
  props: {
    settings: Object,
    actionIndex: Number,
  },
  components: {
    CommandChain: CommandChain,
    CommandAddEdit: CommandAddEdit,
    ScopeSettings,
    ShortcutButton
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
    if (this.actionIndex >= 0) {
      // this.currentCmdIndex = this.actionIndex;
      this.action = this.settings.active.actions[this.actionIndex];
      this.currentCmdIndex = this.actionIndex;
    }
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
      handler: function(val) {
        this.action = val;
      }
    }
  },
  methods: {
    parseActionShortcut(action) {
      return KeyboardShortcutParser.parseShortcut(action.shortcut[0]);
    },
    parseCommand(cmd) {
      let cmdstring = '';
      for(const c of cmd) {
        cmdstring += `${c.action} ${c.arg} ${c.customArg ? '' : c.customArg} | ${c.persistent ? ' persistent' : ''}; `;
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
      if(this.action.scopes[scope] === undefined) {
        this.action.scopes[scope] = {};
      }
      this.action.scopes[scope][prop] = value;

      // TODO: remove for release
      // this.action = JSON.parse(JSON.stringify(this.action))
    },
    addNewCommand() {
      this.currentCmdIndex = -1;
      this.currentCmd = undefined;
      this.addEditCommand = true;
    },
    editCommand(index) {
      this.currentCmdIndex = index;
      this.currentCmd = this.action.cmd[index];
      this.addEditCommand = true;
    },
    deleteCommand(index) {
      this.action.cmd.splice(index,1);
    },
    updateCommand(action, arg, customArg) {
      this.addEditCommand = false;

      if (this.currentCmdIndex < 0) {
        this.action.cmd.push({
          action: action,
          arg: arg,
          customArg: customArg,
        });
      } else {
        this.action.cmd[this.currentCmdIndex] = {
          action: action,
          arg: arg,
          customArg: customArg,
        };
      }
      this.action = JSON.parse(JSON.stringify(this.action));
    },
    saveSettings() {
      if (this.currentCmdIndex < 0) {
        this.settings.active.actions.push({...this.action, ...{userAdded: true}});
      }
      this.settings.save();
      this.close();
    },
    cancel() {
      this.settings.rollback();
      this.close();
    },
    close() {
      this.$emit('close');
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../res/css/colors';

.cae-margin {
  margin-top: 20px;
}

.full-screen {
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
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
  text-align: left;
  // text-align: right;
  vertical-align: baseline;
}

.tab-title {
  font-size: 1.2em;
  color: lighten($primary-color, 25%);
  padding-top: 20px;
  padding-bottom: 10px;
}

.hint {
  opacity: 50% !important;
  font-weight: 300;
}

.w100 {
  width: 100%;
}

.button {
  margin-left: 1em;
  margin-right: 1em;
  padding-left: 1em;
  padding-right: 1em;
  padding-top: 0.4em;
  width: 4em;
  text-align: center;
  background-color: rgba(0,0,0,0.66);
  color: #ffc;
  height: 1.7em;
}

.command-chain-border {
  border: 1px dotted lighten($selected-color, 10%);
  padding: 10px;
  padding-top: 20px;
  padding-bottom: 20px;
}

.section-pad {
  padding-top: 35px;
}

</style>
