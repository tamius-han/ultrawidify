<template>
  <div class="w100 flex flex-column">
    <div v-if="true"
         class="w100"
    >

      <!-- ENABLE EXTENSION -->
      <div class="label">Enable extension {{scope === 'site' ? 'for this site' : ''}}:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-extension-mode'"
                          class="flex button"
                          :class="{'setting-selected': getDefault('set-extension-mode') === action.cmd[0].arg}"
                          :label="(action.scopes[this.scope] && action.scopes[this.scope].label) ? action.scopes[this.scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <!-- ENABLE AUTODETECTION -->
    <div v-if="true"
         class="w100"
    >
      <div class="label">Enable autodetection {{scope === 'site' ? 'for this site' : ''}}:</div>
      <div class="warning"><small>Note: some sites implement restrictions that make autodetection a fair bit less reliable in Firefox and outright impossible in anything else.</small></div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-autoar-mode'"
                          class="flex button"
                          :class="{'setting-selected': getDefault('set-autoar-mode') === action.cmd[0].arg}"
                          :label="(action.scopes[this.scope] && action.scopes[this.scope].label) ? action.scopes[this.scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <!-- DEFAULT SETTINGS -->
    <div v-if="true">
      <div class="label">Default stretching mode:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-stretch'"
                          class="flex b3 button"
                          :class="{'setting-selected': getDefault('set-stretch') === action.cmd[0].arg}"
                          :label="(action.scopes[this.scope] && action.scopes[this.scope].label) ? action.scopes[this.scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <div v-if="true">
      <div class="label">Video alignment:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes[this.scope] && action.scopes[this.scope].show && action.cmd.length === 1 && action.cmd[0].action === 'set-alignment'"
                          class="flex b3 button"
                          :class="{'setting-selected': getDefault('set-alignment') === action.cmd[0].arg}"
                          :label="(action.scopes[this.scope] && action.scopes[this.scope].label) ? action.scopes[this.scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>

    <div v-if="true">
      <div class="label">Multi-command actions:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of settings.active.actions">
          <ShortcutButton v-if="action.scopes[this.scope] && action.scopes[this.scope].show && action.cmd.length > 1"
                          class="flex b3 button"
                          :label="(action.scopes[this.scope] && action.scopes[this.scope].label) ? action.scopes[this.scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
                          >
          </ShortcutButton>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import ExecAction from '../js/ExecAction'
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser'
import ShortcutButton from '../../common/components/shortcut-button'

export default {
  data() {
    return {
    }
  },
  props: [
    'settings',
    'frame',
    'scope',
  ],
  created() {
    this.exec = new ExecAction(this.settings);
  },
  components: {
    ShortcutButton,
  },
  computed: {
    siteActions: function() {
      return this.settings.active.actions.filter(x => x.scopes[this.scope] && x.scopes[this.scope].show);
    }
  },
  methods: {
    execAction(action) {
      this.exec.exec(action, this.scope, this.frame);
    },
    getDefault(action) {

    },
    parseShortcut(action) {
      if (! action.scopes[this.scope].shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(action.scopes[this.scope].shortcut[0]);
    },
  }
}
</script>

<style>

</style>
