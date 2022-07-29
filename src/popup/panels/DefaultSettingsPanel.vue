<template>
  <div class="flex flex-column" style="padding-bottom: 20px">
    <!-- <ShortcutButton class="button" 
                    @click.native="wipeSettings()"
                    label="Wipe settings"
    />  -->
    
      <!-- ENABLE EXTENSION -->
    <div v-if="settings && extensionActions.length"
          class="w100"
    >
    <div class="label">Enable extension <template v-if="scope === 'site'">for {{site}}</template>:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of extensionActions"
                        class="flex flex-grow button"
                        :key="index"
                        :class="{'setting-selected': getCurrent('mode') === action.cmd[0].arg }"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
        >
        </ShortcutButton>
      </div>
    </div>

    <!-- ENABLE AUTODETECTION -->
    <div v-if="aardActions.length"
         class="w100"
    >
      <div class="label">Enable autodetection <template v-if="scope === 'site'">for {{site}}</template>:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of aardActions"
                        class="flex flex-grow button"
                        :class="{'setting-selected': getCurrent('autoar') === action.cmd[0].arg}"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
        >
        </ShortcutButton>
      <div class="info"><small>Note: some sites implement restrictions that make autodetection a fair bit less reliable in Firefox and outright impossible in anything else.</small></div>
      </div>
    </div>

    <!-- CROP MODE PERSISTENCE -->
    <div v-if="cropModePersistenceActions.length"
         class="w100"
    >
      <div class="label">Persists crop mode <template v-if="scope === 'site'">for {{site}}</template>:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of cropModePersistenceActions"
                        class="flex flex-grow button b3"
                        :class="{'setting-selected': getCurrent('cropModePersistence') === action.cmd[0].arg}"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
        >
        </ShortcutButton>
      </div>
    </div>

    <!-- DEFAULT SETTINGS -->
    <div v-if="stretchActions.length">
      <div class="label experimental">Default stretching mode:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of stretchActions"
                        class="flex b3 flex-grow button"
                        :class="{'setting-selected': getCurrent('stretch') === action.cmd[0].arg}"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
        >
        </ShortcutButton>
      </div>
    </div>

    <div v-if="keyboardActions.length">
      <div class="label experimental">Enable/disable keyboard shortcuts</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of keyboardActions"
                        class="flex b3 flex-grow button"
                        :class="{'setting-selected': getCurrent('keyboardShortcutsEnabled') === action.cmd[0].arg}"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>

    <div v-if="alignmentActions.length">
      <div class="label">Video alignment:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of alignmentActions"
                        class="flex b3 flex-grow button"
                        :class="{'setting-selected': getCurrent('videoAlignment') === action.cmd[0].arg}"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>

    <div v-if="otherActions.length">
      <div class="label">Other actions:</div>
      <div class="flex flex-row flex-wrap">
        <ShortcutButton v-for="(action, index) of otherActions"
                        class="flex b3 flex-grow button"
                        :key="index"
                        :label="(action.scopes[scope] && action.scopes[scope].label) ? action.scopes[scope].label : action.label"
                        :shortcut="parseShortcut(action)"
                        @click.native="execAction(action)"
                        >
        </ShortcutButton>
      </div>
    </div>
  </div>
</template>

<script>
import ExecAction from '../js/ExecAction';
import KeyboardShortcutParser from '../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../common/components/ShortcutButton';
import ComputeActionsMixin from '../../common/mixins/ComputeActionsMixin';

export default {
  data() {
    return {
    }
  },
  mixins: [
    ComputeActionsMixin
  ],
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
      } else {
        if (!this.site) {
          return '';
        }
        site = this.site;
      }
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
    wipeSettings() {
      settings.setDefaultSettings();
    }
  }
}
</script>

<style>
</style>
