<template>
  <div>
    <!-- Enable extension -->
    <div class="field">
      <div class="label">
        Enable extension under the following conditions:
      </div>
      <div class="select">
        <select
          v-model="simpleExtensionSettings.enable"
          @click="setExtensionMode('enable', $event)"
        >
          <option
            v-if="simpleExtensionSettings.enable === 'complex'"
            value="complex"
          >
            (Site uses advanced settings)
          </option>
          <template v-if="isDefaultConfiguration">
            <option value="disabled">
              Disabled (unless enabled for specific site)
            </option>
          </template>
          <template v-else>
            <option value="default">
              Use default ()
            </option>
            <option value="disabled">
              Never
            </option>
          </template>
          <option value="fs">
            Fullscreen only
          </option>
          <option value="theater">
            Fullscreen and theater mode
          </option>
          <option value="enabled">
            Always
          </option>
        </select>
      </div>
    </div>

    <!-- Enable AARD -->
    <div class="field">
      <div class="label">
        Enable automatic aspect ratio detection under the following conditions:
      </div>
      <div class="select">
        <select
          v-model="simpleExtensionSettings.enableAard"
          @click="setExtensionMode('enableAard', $event)"
        >
          <option
            v-if="simpleExtensionSettings.enable === 'complex'"
            value="complex"
          >
            (Site uses advanced settings)
          </option>
          <template v-if="isDefaultConfiguration">
            <option value="disabled">
              Disabled (unless enabled for specific site)
            </option>
          </template>
          <template v-else>
            <option value="default">
              Use default ()
            </option>
            <option value="disabled">
              Never
            </option>
          </template>
          <option value="fs">
            Fullscreen only
          </option>
          <option value="theater">
            Fullscreen and theater mode
          </option>
          <option value="enabled">
            Always
          </option>
        </select>
      </div>
    </div>

    <!-- Enable keyboard -->
    <div class="field">
      <div class="label">
        Enable keyboard shortcuts under the following conditions
      </div>
      <div class="select">
        <select
          v-model="simpleExtensionSettings.enableKeyboard"
          @click="setExtensionMode('enableKeyboard', $event)"
        >
          <option
            v-if="simpleExtensionSettings.enable === 'complex'"
            value="complex"
          >
            (Site uses advanced settings)
          </option>
          <template v-if="isDefaultConfiguration">
            <option value="disabled">
              Disabled (unless enabled for specific site)
            </option>
          </template>
          <template v-else>
            <option value="default">
              Use default ()
            </option>
            <option value="disabled">
              Never
            </option>
          </template>
          <option value="fs">
            Fullscreen only
          </option>
          <option value="theater">
            Fullscreen and theater mode
          </option>
          <option value="enabled">
            Always
          </option>
        </select>
      </div>
    </div>

    <!-- Default crop -->
    <div class="field">
      <div class="label">Default crop:</div>
      <div class="select">
        <select
          v-model="siteDefaultCrop"
          @click="setOption('defaults.crop', $event)"
        >
          <option
            v-if="!isDefaultConfiguration"
            :value="undefined"
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
      <div class="hint">This is how extension will crop video if/when autodetection is disabled. Pick 'Reset' option to keep aspect ratio as-is by default.</div>
    </div>

    <!-- Default stretch -->
    <div class="field">
      <div class="label">Default stretch:</div>
      <div class="select">
        <select
          v-model="siteDefaultStretch"
          @click="setOption('defaults.stretch', $event)"
        >
          <option
            v-if="!isDefaultConfiguration"
            :value="undefined"
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
          @click="setOption('defaults.alignment', $event)"
        >
          <option
            v-if="!isDefaultConfiguration"
            :value="undefined"
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
            Use default ({{defaultPersistanceLabel}})
          </option>
          <option :value="CropModePersistence.Disabled">Disabled</option>
          <option :value="CropModePersistence.UntilPageReload">Until page reload</option>
          <option :value="CropModePersistence.CurrentSession">Current session</option>
          <option :value="CropModePersistence.Forever">Always persist</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import ExtensionMode from '../../../../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../../../../common/enums/VideoAlignmentType.enum';
import CropModePersistence from './../../../../../common/enums/CropModePersistence.enum';

export default {
  data() {
    return {
      CropModePersistence: CropModePersistence,
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
      }
    },
    siteDefaultCrop() {
      return this.siteSettings.raw?.defaults?.crop ? JSON.stringify(this.siteSettings.raw?.defaults?.crop) : undefined;
    },
    siteDefaultStretch() {
      return this.siteSettings.raw?.defaults?.stretch ? JSON.stringify(this.siteSettings.raw?.defaults?.stretch) : undefined;
    },
    siteDefaultAlignment() {
      return this.siteSettings.raw?.defaults?.alignment ? JSON.stringify(this.siteSettings.raw?.defaults?.alignment) : undefined;
    },
    siteDefaultCropPersistence() {
      return this.siteSettings.raw?.persistCSA ?? undefined;
    },
    defaultPersistanceLabel() {
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
  methods: {
    /**
     * Compiles our extension settings into more user-friendly options
     */
    compileSimpleSettings(component) {
      try {
        if (
          this.siteSettings?.data?.[component]?.normal        === ExtensionMode.Disabled
          && this.siteSettings?.data?.[component]?.theater    === ExtensionMode.Disabled
          && this.siteSettings?.data?.[component]?.fullscreen === ExtensionMode.Disabled
        ) {
          return 'disabled';
        }
        if (
          this.siteSettings?.data?.[component]?.normal        === ExtensionMode.Default
          && this.siteSettings?.data?.[component]?.theater    === ExtensionMode.Default
          && this.siteSettings?.data?.[component]?.fullscreen === ExtensionMode.Default
        ) {
          return 'default';
        }
        if (
          this.siteSettings?.data?.[component]?.normal        === ExtensionMode.Disabled
          && this.siteSettings?.data?.[component]?.theater    === ExtensionMode.Disabled
          && this.siteSettings?.data?.[component]?.fullscreen === ExtensionMode.Enabled
        ) {
          return 'fs';
        }
        if (
          this.siteSettings?.data?.[component]?.normal        === ExtensionMode.Disabled
          && this.siteSettings?.data?.[component]?.theater    === ExtensionMode.Enabled
          && this.siteSettings?.data?.[component]?.fullscreen === ExtensionMode.Enabled
        ) {
          return 'theater';
        }
        if (
          this.siteSettings?.data?.[component]?.normal        === ExtensionMode.Enabled
          && this.siteSettings?.data?.[component]?.theater    === ExtensionMode.Enabled
          && this.siteSettings?.data?.[component]?.fullscreen === ExtensionMode.Enabled
        ) {
          return 'enabled';
        }

        return 'complex';
      } catch (e) {
        return 'loading';
      }
    },

    getCommandValue(availableCommands, command) {
      console.log('command:', command, 'from available commands', availableCommands);

      for (const cmd of availableCommands) {
        console.log('——— processing command:', cmd)
        console.log('comparing', JSON.stringify(command), 'to', JSON.stringify(cmd.arguments));
        if (JSON.stringify(cmd.arguments) === JSON.stringify(command)) {
          return cmd.label;
        }
      }

      return 'Unknown command';
    },

    getAlignmentLabel(alignment) {
      console.log('alignment for site. ----------------------------', alignment);

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
    setOption(option, $event) {
      let commandArguments;

      // if argument is json, parse json. Otherwise, pass the value as-is
      try {
        commandArguments = $event.target.value !== undefined ? JSON.parse($event.target.value) : undefined;
      } catch(e) {
        commandArguments = $event.target.value;
      }

      this.siteSettings.set(option, commandArguments);
    },
    setExtensionMode(component, event) {
      const option = event.target.value;

      if (option === 'complex') {
        return;
      }

      if (option === 'default') {
        return this.siteSettings.set(component, {
          normal: ExtensionMode.Default,
          theater: ExtensionMode.Default,
          fullscreen: ExtensionMode.Default
        });
      }
      if (option === 'disabled') {
        return this.siteSettings.set(component, {
          normal: ExtensionMode.Disabled,
          theater: ExtensionMode.Disabled,
          fullscreen: ExtensionMode.Disabled
        });
      }
      if (option === 'enabled') {
        return this.siteSettings.set(component, {
          normal: ExtensionMode.Enabled,
          theater: ExtensionMode.Enabled,
          fullscreen: ExtensionMode.Enabled
        });
      }
      if (option === 'theater') {
        return this.siteSettings.set(component, {
          normal: ExtensionMode.Disabled,
          theater: ExtensionMode.Enabled,
          fullscreen: ExtensionMode.Enabled
        });
      }
      if (option === 'fs') {
        return this.siteSettings.set(component, {
          normal: ExtensionMode.Disabled,
          theater: ExtensionMode.Disabled,
          fullscreen: ExtensionMode.Enabled
        });
      }
    }
  }

}
</script>

<style lang="scss" src="../../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../../../res-common/panels.scss" scoped></style>
<style lang="scss" src="../../../res-common/common.scss" scoped></style>
<style scoped>
.button-hover:hover {
  color: #fa6;
}
</style>
