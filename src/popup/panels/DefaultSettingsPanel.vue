<template>
  <div class="w100 flex flex-column">
    <div v-if="settings && true"
         class="w100"
    >
      <!-- ENABLE EXTENSION -->
      <div class="label">Enable extension {{scope === 'site' ? 'for this site' : ''}}:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-extension-mode'"
                          class="flex flex-grow button"
                          :class="{'setting-selected': getCurrent('mode') === action.cmd[0].arg }"
                          :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
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
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-autoar-mode'"
                          class="flex flex-grow button"
                          :class="{'setting-selected': getCurrent('autoar') === action.cmd[0].arg}"
                          :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                          :shortcut="parseShortcut(action)"
                          @click.native="execAction(action)"
          >
          </ShortcutButton>
        </template>
      <div class="info"><small>Note: some sites implement restrictions that make autodetection a fair bit less reliable in Firefox and outright impossible in anything else.</small></div>
      </div>
    </div>

    <!-- DEFAULT SETTINGS -->
    <div v-if="true">
      <div class="label">Default stretching mode:</div>
      <div class="flex flex-row flex-wrap">
        <template v-for="action of siteActions">
          <ShortcutButton v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-stretch'"
                          class="flex b3 flex-grow button"
                          :class="{'setting-selected': getCurrent('stretch') === action.cmd[0].arg}"
                          :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
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
          <ShortcutButton v-if="action.scopes[scope] && action.scopes[scope].show && action.cmd.length === 1 && action.cmd[0].action === 'set-alignment'"
                          class="flex b3 flex-grow button"
                          :class="{'setting-selected': getCurrent('videoAlignment') === action.cmd[0].arg}"
                          :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
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
          <ShortcutButton v-if="action.scopes[scope] && action.scopes[scope].show && action.cmd.length > 1"
                          class="flex b3 flex-grow button"
                          :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
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
  props: {
    settings: Object,
    scope: String,
    site: String,
  },
  created() {
    this.exec = new ExecAction(this.settings, this.site);
  },
  components: {
    ShortcutButton,
  },
  computed: {
    siteActions: function() {
      return this.settings.active.actions.filter(x => x.scopes[this.scope] && x.scopes[this.scope].show);
    }
  },
  watch: {
    settings: {
      deep: true,
      handler: function(val) {
        this.$forceUpdate();
        this.exec.setSettings(val);
      }
    },
    site: function(val){
      this.exec.setSite(val);
    }
  },
  methods: {
    execAction(action) {
      this.exec.exec(action, this.scope);
    },
    getCurrent(option) {
      if (!this.settings) {
        return undefined;
      }

      let site;
      if (this.scope === 'global') {
        site = '@global'
        this.site = site;
      } else {
        if (!this.site) {
          return '';
        }
        site = this.site;
      }
      // console.log("SETTINGS FOR SITE", site, "option", option, JSON.parse(JSON.stringify(this.settings.active.sites)))
      if (this.settings.active.sites[site]) {
        return this.settings.active.sites[site][option];
      } else {
        return this.settings.getDefaultOption(option);
      }
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
.button-selected {
  background-color: "#fff"
}
.setting-selected {
  background-color: #ffa;
}
</style>
