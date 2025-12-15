<template>
  <div>
    <!-- Enable extension -->
    <div class="field">
      <div class="label">
        Enable <span class="color-emphasis">extension</span>
        <span class="sub-label"><br/>under the following conditions:</span>
      </div>
      <div class="select">
        <select
          :value="simpleExtensionSettings.enable"
          @click="setExtensionMode('enable', $event)"
        >
          <option
            v-if="simpleExtensionSettings.enable === 'invalid'"
            :value="undefined"
          >
            (Site uses advanced settings)
          </option>
          <template v-if="isDefaultConfiguration">
            <option :value="ExtensionMode.Disabled">
              Disabled by default
            </option>
          </template>
          <template v-else>
            <option :value="ExtensionMode.Default">
              Use default ({{simpleDefaultSettings.enable}})
            </option>
            <option :value="ExtensionMode.Disabled">
              Never
            </option>
          </template>
          <option :value="ExtensionMode.FullScreen">
            Fullscreen only
          </option>
          <option :value="ExtensionMode.Theater">
            Fullscreen and theater mode
          </option>
          <option :value="ExtensionMode.All">
            Always
          </option>
        </select>
      </div>
    </div>

    <!-- The rest of the menu is disabled when extension is disabled -->
    <div :class="{disabled: simpleEffectiveSettings.enable === 'disabled' && !isDefaultConfiguration}">
      <!-- Enable AARD -->
      <div class="field">
        <div class="label">
          Enable <span class="color-emphasis">automatic aspect ratio detection</span>
          <span class="sub-label"><br/>under the following conditions:</span>
        </div>
        <div class="select">
          <select
            :value="simpleExtensionSettings.enableAard"
            @click="setExtensionMode('enableAard', $event)"
          >
            <option
              v-if="simpleExtensionSettings.enable === 'complex'"
              value="complex"
            >
              (Site uses advanced settings)
            </option>
            <template v-if="isDefaultConfiguration">
              <option :value="ExtensionMode.Disabled">
                Disabled by default
              </option>
            </template>
            <template v-else>
              <option :value="ExtensionMode.Default">
                Use default ({{simpleDefaultSettings.enableAard}})
              </option>
              <option :value="ExtensionMode.Disabled">
                Never
              </option>
            </template>
            <option :value="ExtensionMode.FullScreen">
              Fullscreen only
            </option>
            <option :value="ExtensionMode.Theater">
              Fullscreen and theater mode
            </option>
            <option :value="ExtensionMode.All">
              Always
            </option>
          </select>
        </div>
      </div>

      <!-- Enable keyboard -->
      <div class="field">
        <div class="label">
          Enable <span class="color-emphasis">keyboard shortcuts</span>
          <span class="sub-label"><br/>under the following conditions:</span>
        </div>
        <div class="select">
          <select
            :value="simpleExtensionSettings.enableKeyboard"
            @click="setExtensionMode('enableKeyboard', $event)"
          >
            <option
              v-if="simpleExtensionSettings.enable === 'complex'"
              value="complex"
            >
              (Site uses advanced settings)
            </option>
            <template v-if="isDefaultConfiguration">
              <option :value="ExtensionMode.Disabled">
                Disabled by default
              </option>
            </template>
            <template v-else>
              <option :value="ExtensionMode.Default">
                Use default ({{simpleDefaultSettings.enableKeyboard}})
              </option>
              <option :value="ExtensionMode.Disabled">
                Never
              </option>
            </template>
            <option :value="ExtensionMode.FullScreen">
              Fullscreen only
            </option>
            <option :value="ExtensionMode.Theater">
              Fullscreen and theater mode
            </option>
            <option :value="ExtensionMode.All">
              Always
            </option>
          </select>
        </div>
      </div>

      <!-- Enable UI -->
      <div class="field">
        <div class="label">
          Enable <span class="color-emphasis">in-player UI</span>
          <span class="sub-label"><br/>under the following conditions:</span>
        </div>
        <div class="select">
          <select
            :value="simpleExtensionSettings.enableUI"
            @click="setExtensionMode('enableUI', $event)"
          >
            <template v-if="isDefaultConfiguration">
              <option :value="ExtensionMode.Disabled">
                Disabled by default
              </option>
            </template>
            <template v-else>
              <option :value="ExtensionMode.Default">
                Use default ({{simpleDefaultSettings.enableUI}})
              </option>
              <option :value="ExtensionMode.Disabled">
                Never
              </option>
            </template>
            <option :value="ExtensionMode.FullScreen">
              Fullscreen only
            </option>
            <option :value="ExtensionMode.Theater">
              Fullscreen and theater
            </option>
            <option :value="ExtensionMode.Theater">
              Where possible
            </option>
          </select>
        </div>
      </div>

      <div class="field">
        <div class="label">
          Use these settings for <span class="color-emphasis">embedded content</span>?
          <!-- <span class="sub-label"><br/>under the following conditions:</span> -->
        </div>
        <div class="select">
          <select
            :value="siteDefaultForEmbedded"
            @click="setSiteOption('applyToEmbeddedContent', $event)"
          >
            <option :value="EmbeddedContentSettingsOverridePolicy.Always">
              Always(-ish)
            </option>
            <option :value="EmbeddedContentSettingsOverridePolicy.UseAsDefault">
              Use as default
            </option>
            <option :value="EmbeddedContentSettingsOverridePolicy.Never">
              Never
            </option>
          </select>
        </div>
      </div>

      <div class="field">
        <div class="label">
          Force these settings <span class="color-emphasis">when embedded</span>?
          <!-- <span class="sub-label"><br/>under the following conditions:</span> -->
        </div>
        <div class="select">
          <select
            :value="siteDefaultOverrideEmbedded"
            @click="setSiteOption('overrideWhenEmbedded', $event)"
          >
            <option :value="true">
              Yes
            </option>
            <option :value="false">
              No
            </option>
          </select>
        </div>
      </div>

      <!-- Default crop -->
      <div class="field">
        <div class="label">Default crop:</div>
        <div class="select">
          <select
            :value="siteDefaultCrop"
            @change="setOption('defaults.crop', $event)"
          >
            <option
              v-if="!isDefaultConfiguration"
              :value="JSON.stringify({useDefault: true})"
            >
              Use default ({{getCommandValue(settings?.active.commands.crop, siteSettings.data.defaults.crop)}})
            </option>
            <option
              v-for="(command, index) of settings?.active.commands.crop"
              :key="index"
              :value="JSON.stringify(command.arguments)"
            >
              {{command.label}}
            </option>
          </select>
        </div>
      </div>
      <div class="hint">This is how extension will crop video if/when autodetection is disabled. Pick 'Reset' option to keep aspect ratio as-is by default.</div>

      <!-- Default stretch -->
      <div class="field">
        <div class="label">Default stretch:</div>
        <div class="select">
          <select
            v-model="siteDefaultStretch"
            @change="setOption('defaults.stretch', $event)"
          >
            <option
              v-if="!isDefaultConfiguration"
              :value="JSON.stringify({useDefault: true})"
            >
              Use default ({{getCommandValue(settings?.active.commands.stretch, siteSettings.data.defaults.stretch)}})
            </option>
            <option
              v-for="(command, index) of settings?.active.commands.stretch"
              :key="index"
              :value="JSON.stringify(command.arguments)"
            >
              {{command.label}}
            </option>
          </select>
        </div>
      </div>

      <!-- Default alignment -->
      <div class="field">
        <div class="label">Default alignment:</div>
        <div class="select">
          <select
            v-model="siteDefaultAlignment"
            @change="setOption('defaults.alignment', $event)"
          >
            <option
              v-if="!isDefaultConfiguration"
              :value="JSON.stringify({useDefault: true})"
            >
              Use default ({{getAlignmentLabel(siteSettings.data.defaults.alignment)}})
            </option>
            <option
              v-for="(command, index) of alignmentOptions"
              :key="index"
              :value="JSON.stringify(command.arguments)"
            >
              {{command.label}}
            </option>
          </select>
        </div>
      </div>

      <!-- Crop, et. al. Persistence -->
      <div class="field">
        <div class="label">Persist crop, stretch, and alignment between videos</div>
        <div class="select">
          <select
            v-model="siteDefaultCropPersistence"
            @click="setOption('persistCSA', $event)"
          >
            <option
              v-if="!isDefaultConfiguration"
              :value="CropModePersistence.Default"
            >
              Use default ({{defaultPersistenceLabel}})
            </option>
            <option :value="CropModePersistence.Disabled">Disabled</option>
            <option :value="CropModePersistence.UntilPageReload">Until page reload</option>
            <option :value="CropModePersistence.CurrentSession">Current session</option>
            <option :value="CropModePersistence.Forever">Always persist</option>
          </select>
        </div>
      </div>
    </div>

    <pre>
      SITE SETTINGS: raw
      {{JSON.stringify(siteSettings.raw)}}

      SITE SETTINGS: data
      {{JSON.stringify(siteSettings.data)}}
    </pre>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';
import CropModePersistence from '@src/common/enums/CropModePersistence.enum';
import EmbeddedContentSettingsOverridePolicy from '@src/common/enums/EmbeddedContentSettingsOverridePolicy.enum';

export default defineComponent({
  data() {
    return {
      CropModePersistence: CropModePersistence,
      ExtensionMode,
      EmbeddedContentSettingsOverridePolicy,
      alignmentOptions: [
        {label: 'Top left', arguments: {x: VideoAlignmentType.Left, y: VideoAlignmentType.Top}},
        {label: 'Top center', arguments: {x: VideoAlignmentType.Center, y: VideoAlignmentType.Top}},
        {label: 'Top right', arguments: {x: VideoAlignmentType.Right, y: VideoAlignmentType.Top}},
        {label: 'Left', arguments: {x: VideoAlignmentType.Left, y: VideoAlignmentType.Center}},
        {label: 'Center', arguments: {x: VideoAlignmentType.Center, y: VideoAlignmentType.Center}},
        {label: 'Right', arguments: {x: VideoAlignmentType.Right, y: VideoAlignmentType.Center}},
        {label: 'Bottom left', arguments: {x: VideoAlignmentType.Left, y: VideoAlignmentType.Bottom}},
        {label: 'Bottom center', arguments: {x: VideoAlignmentType.Center, y: VideoAlignmentType.Bottom}},
        {label: 'Bottom right', arguments: {x: VideoAlignmentType.Right, y: VideoAlignmentType.Bottom}}
      ]
    }
  },
  mixins: [

  ],
  props: [
    'settings',
    'siteSettings',
    'isDefaultConfiguration'
  ],
  components: {

  },
  computed: {
    simpleExtensionSettings() {
      return {
        enable: this.compileSimpleSettings('enable'),
        enableAard: this.compileSimpleSettings('enableAard'),
        enableKeyboard: this.compileSimpleSettings('enableKeyboard'),
        enableUI: this.compileSimpleSettings('enableUI')
      }
    },
    simpleEffectiveSettings() {
      return {
        enable: this.compileSimpleSettings('enable', 'site-effective'),
        enableAard: this.compileSimpleSettings('enableAard', 'site-effective'),
        enableKeyboard: this.compileSimpleSettings('enableKeyboard', 'site-effective'),
        enableUI: this.compileSimpleSettings('enableUI', 'site-effective')
      }
    },
    simpleDefaultSettings() {
      return {
        enable: this.getDefaultOptionLabel('enable'),
        enableAard: this.getDefaultOptionLabel('enableAard'),
        enableKeyboard: this.getDefaultOptionLabel('enableKeyboard'),
        enableUI: this.getDefaultOptionLabel('enableUI')
      };
    },
    siteDefaultForEmbedded() {
      return this.siteSettings.raw?.applyToEmbeddedContent;
    },
    siteDefaultOverrideEmbedded() {
      return this.siteSettings.raw?.overrideWhenEmbedded ?? false;
    },
    siteDefaultCrop() {
      return this.siteSettings.raw?.defaults?.crop ? JSON.stringify(this.siteSettings.raw?.defaults?.crop) : JSON.stringify({useDefault: true});
    },
    siteDefaultStretch() {
      return this.siteSettings.raw?.defaults?.stretch ? JSON.stringify(this.siteSettings.raw?.defaults?.stretch) : JSON.stringify({useDefault: true});
    },
    siteDefaultAlignment() {
      return this.siteSettings.raw?.defaults?.alignment ? JSON.stringify(this.siteSettings.raw?.defaults?.alignment) : JSON.stringify({useDefault: true});
    },
    siteDefaultCropPersistence() {
      return this.siteSettings.raw?.persistCSA ?? undefined;
    },
    defaultPersistenceLabel() {
      switch (this.siteSettings.defaultSettings.persistCSA) {
        case CropModePersistence.CurrentSession:
          return 'current session';
        case CropModePersistence.Disabled:
          return 'disabled';
        case CropModePersistence.UntilPageReload:
          return 'until page reload';
        case CropModePersistence.Forever:
          return 'Always persist';
      }

      return '??';
    }
  },
  mounted() {
    this.forceRefreshPage();
  },
  methods: {
    /**
     * Compiles our extension settings into more user-friendly options
     */
    compileSimpleSettings(component, getFor = 'site'): ExtensionMode {

      let settingsData;
      switch (getFor) {
        case 'site':
          settingsData = this.siteSettings?.raw;
          break;
        case 'site-effective':
          settingsData = this.siteSettings?.data;
          break;
        case 'default':
          settingsData = this.settings.active.sites['@global'];
          break;
      }

      console.log('compiling simple settings;', settingsData, 'original settings:', this.siteSettings)

      return settingsData?.[component];
    },

    getDefaultOptionLabel(component) {
      const componentValue: ExtensionMode = this.compileSimpleSettings(component, 'default');

      switch (componentValue) {
        case ExtensionMode.Disabled:
          return 'disabled';
        case ExtensionMode.Default:
          return 'default';
        case ExtensionMode.FullScreen:
          return 'fullscreen only';
        case ExtensionMode.Theater:
          return 'fullscreen & theater';
        case ExtensionMode.All:
          return 'always';
        default:
          return '<Invalid value>';
      }
    },

    getCommandValue(availableCommands, command) {
      for (const cmd of availableCommands) {
        if (JSON.stringify(cmd.arguments) === JSON.stringify(command)) {
          return cmd.label;
        }
      }
      return 'Unknown command';
    },

    getAlignmentLabel(alignment) {
      // in case default settings don't have this set
      if (!alignment) {
        return 'Center'
      }

      let x, y;
      if (alignment.x === VideoAlignmentType.Center) {
        x = 'center';
      } else if (alignment.x === VideoAlignmentType.Left) {
        x = 'left';
      } else if (alignment.x === VideoAlignmentType.Right) {
        x = 'right';
      } else {
        x = '??'
      }

      if (alignment.y === VideoAlignmentType.Center) {
        y = 'center';
      } else if (alignment.y === VideoAlignmentType.Bottom) {
        y = 'bottom';
      } else if (alignment.y === VideoAlignmentType.Top) {
        y = 'top';
      } else {
        y = '???'
      };

      if (x === y) {
        return x;
      }
      return `${y} ${x}`;
    },
    getOption(option) {

    },
    async setOption(option, $event) {
      const value = $event.target.value;
      let commandArguments;

      // if argument is json, parse json. Otherwise, pass the value as-is
      try {
        commandArguments = value !== undefined ? JSON.parse(value) : undefined;
      } catch(e) {
        commandArguments = value;
      }

      if (commandArguments.useDefault) {
        commandArguments = undefined;
      }

      await this.siteSettings.set(option, commandArguments, {reload: false});

      // we also need to force re-compute all watchers, otherwise UI will lag behind
      // actual state of settings until reload
      this.forceRefreshPage();
    },
    forceRefreshPage() {
      this._computedWatchers?.simpleExtensionSettings?.run();
      this._computedWatchers?.simpleDefaultSettings?.run();
      this._computedWatchers?.siteDefaultCrop?.run();
      this._computedWatchers?.siteDefaultStretch?.run();
      this._computedWatchers?.siteDefaultAlignment?.run();
      this._computedWatchers?.siteDefaultCropPersistence?.run();
      this._computedWatchers?.defaultPersistenceLabel?.run();

      this.$nextTick( () => this.$forceUpdate());
    },

    setSiteOption(optionPath, event) {
      const value = event.target.value;
      this.siteSettings.set(optionPath, value);
    },

    setExtensionMode(component, event) {
      const option = event.target.value;

      console.log('set extension mode - we received option', option, 'for component', component);

      return;
      if (option === 'complex') {
        return;
      }



      if (component === 'enable' && !this.isDefaultConfiguration) {
        this.setExtensionMode('enableAard', event);
        this.setExtensionMode('enableKeyboard', event);

        // in enableUI, 'enabled' is unused and 'theater' uses its place
        if (option === 'enabled') {
          this.setExtensionMode('enableUI', {target: {value: 'theater'}});
        } else {
          this.setExtensionMode('enableUI', event);
        }
      }

    }
  }

});
</script>

<style scoped>
</style>
