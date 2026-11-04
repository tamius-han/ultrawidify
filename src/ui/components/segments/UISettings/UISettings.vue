<template>
  <div class="flex flex-col relative w-full">

    <div v-if="settings.active?.ui?.popup?.aspectRatioInterface === 'legacy' || settings.active?.commandsLegacy" class="mb-8">
      <h2 class="text-[1.75em]">Popup UI options</h2>
      <div v-if="settings" class="flex flex-col w-full">
        <div class="flex flex-col gap-2">
          <div class="flex flex-col field-group compact-form gap-2 mt-8">
            <!-- <div class="field"> -->
              <div class="label">Aspect ratio interface:</div>
            <!-- </div> -->
            <div class="flex flex-row gap-8">
              <div
                class="ari-item"
                :class="{'active': settings.active.ui.popup?.aspectRatioInterface === 'compact'}"
                @click="setPopupUIType('compact')"
              >
                <img src="/res/img/settings/compact_crop_ui.avif" alt="Compact UI">
                <div>
                  Compact<small><br/>
                  This is default UI for new installs.
                  </small>
                </div>
              </div>
              <div
                class="ari-item"
                :class="{'active': !settings.active.ui.popup?.aspectRatioInterface || settings.active.ui.popup?.aspectRatioInterface === 'legacy'}"
                @click="setPopupUIType('legacy')"
              >
                <img src="/res/img/settings/legacy_crop_ui.avif" alt="Legacy UI">

                <div>
                  Legacy<small><br/>
                  Only available for old installs, as support for this UI will be removed some time in the future.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h2 class="text-[1.75em]">Player UI options</h2>

    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div v-if="settings" class="flex flex-col" style="width: 100%">

      <div class="flex flex-col gap-2">
        <div
          class="flex flex-col field-group compact-form gap-2"
        >

          <div class="field">
            <div class="label">
              Activate in-player UI:
            </div>
            <div class="select">
              <select
                v-model="settings.active.ui.inPlayer.activation"
                @change="saveSettings()"
              >
                <option value="none">
                  Never activate UI with mouse movement alone
                </option>
                <option value="player">
                  When mouse moves over player, always
                </option>
                <option value="distance">
                  (experimental) When mouse is close to the menu activator
                </option>
                <!-- <option value="trigger-zone">
                  When mouse moves over trigger zone
                </option> -->
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              <input type="checkbox"
                v-model="settings.active.ui.inPlayer.activateWithCtrl"
                @change="saveSettings()"
              >
            </div>
            <div class="text-left">
              Also show on CTRL + mouse move
            </div>
          </div>

          <div v-show="settings.active.ui.inPlayer.activation === 'distance'" class="field">
            <div class="label">
              Show menu when mouse is closer than:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activationDistance"
                class="slider"
                type="range"
                min="10"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activationDistance"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activationDistanceUnits"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field" :class="{'disabled': settings.active.ui.inPlayer.activation !== 'trigger-zone'}">
            <div class="label">Edit trigger zone:</div>
            <button @click="startTriggerZoneEdit()">Edit</button>
          </div>

          <div class="field">
            <div class="label">
              Menu activator position:
            </div>
            <div class="select">
              <select
                v-model="settings.active.ui.inPlayer.activatorAlignment"
                @change="saveSettings()"
              >
                <optgroup label="Edges">
                  <option :value="MenuPosition.Left">Left</option>
                  <option :value="MenuPosition.Right">Right</option>
                  <option :value="MenuPosition.Top">Top</option>
                  <option :value="MenuPosition.Bottom">Bottom</option>
                </optgroup>

                <optgroup label="corners">
                  <option :value="MenuPosition.TopLeft">Top left</option>
                  <option :value="MenuPosition.BottomLeft">Bottom left</option>
                  <option :value="MenuPosition.TopRight">Top right</option>
                  <option :value="MenuPosition.BottomRight">Bottom right</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Menu activator horizontal padding:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activatorPadding.x"
                class="slider"
                type="range"
                min="0"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activatorPadding.x"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activatorPaddingUnit.x"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Menu activator vertical padding:
            </div>
            <div class="input range-input">
              <input
                v-model="settings.active.ui.inPlayer.activatorPadding.y"
                class="slider"
                type="range"
                min="0"
                max="100"
                step="1"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                v-model="settings.active.ui.inPlayer.activatorPadding.y"
                @change="(event) => saveSettings(true)"
              >
              <select
                class="unit-select !min-w-[72px]"
                v-model="settings.active.ui.inPlayer.activatorPaddingUnit.y"
                @change="(event) => saveSettings(true)"
              >
                <option value="%">%</option>
                <option value="px">px</option>
              </select>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is narrower than
            </div>
            <div class="input range-input">
              <input
                :value="settings.active.ui.inPlayer.minEnabledWidth"
                class="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                @input="(event) => setPlayerRestrictions('minEnabledWidth', event.target.value)"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                :value="ghettoComputed.minEnabledWidth"
                @input="(event) => setPlayerRestrictions('minEnabledWidth', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
              <div class="unit">% of screen</div>
            </div>
          </div>

          <div class="field">
            <div class="label">
              Do not show in-player UI when video player is shorter than
            </div>
            <div class="input range-input">
              <input
                :value="settings.active.ui.inPlayer.minEnabledHeight"
                class="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                @input="(event) => setPlayerRestrictions('minEnabledHeight', event.target.value)"
                @change="(event) => saveSettings()"
              >
              <input
                style="margin-right: 0.6rem;"
                :value="ghettoComputed.minEnabledHeight"
                @input="(event) => setPlayerRestrictions('minEnabledHeight', event.target.value, true)"
                @change="(event) => saveSettings(true)"
              >
              <div class="unit">% of screen</div>
            </div>
          </div>
        </div>
      </div>

    </div>
    <div v-else>
      Loading settings ...
    </div>
  </div>
</template>

<script lang="ts">
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import { ArVariant } from '@src/common/interfaces/ArInterface';
import { MenuPosition } from '@src/common/interfaces/ClientUiMenu.interface';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { generateCommands } from '@src/ext/conf/ExtensionConf';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
  },
  data() {
    return {
      MenuPosition,
      ghettoComputed: { } as any
    }
  },
  mixins: [
  ],
  props: [
    'settings',      // required for buttons and actions, which are global
    'siteSettings',
    'eventBus',
  ],
  mounted() {
    this.ghettoComputed = {
      minEnabledWidth: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledWidth * 100, 0),
      minEnabledHeight: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledHeight * 100, 0),
    };

    this.eventBus?.send('force-menu-activator-state', {visibility: true});
  },
  unmounted() {
    this.eventBus?.send('force-menu-activator-state', {visibility: false});
  },
  methods: {
    forcePositiveNumber(value) {
      //       Change EU format to US if needed
      //                  |       remove everything after second period if necessary
      //                  |               |            |   remove non-numeric characters
      //                  |               |            |           |
      return value.replaceAll(',', '.').split('.', 2).join('.').replace(/[^0-9.]/g, '');
    },
    optionalToFixed(v, n) {
      if ((`${v}`.split('.')[1]?.length ?? 0) > n) {
        return v.toFixed(n);
      }
      return v;
    },
    setPlayerRestrictions(key: string, value: number | string, isTextInput: boolean) {
      if (isTextInput) {
        value = (+this.forcePositiveNumber(value) / 100);
      }
      if (isNaN(+value)) {
        value = 0.5;
      }

      this.settings.active.ui.inPlayer[key] = value;

      if (isTextInput) {
        this.ghettoComputed[key] = this.optionalToFixed(value, 0);
      } else {
        this.ghettoComputed[key] = this.optionalToFixed(value * 100, 0);
      }
    },
    async saveSettings(forceRefresh) {
      // some settings should probably cross-pollinate:
      //    * if settings are disabled here, this should probably be reflected in the 'site.enableUI' settings as well
      //    * if UI was enabled here, we should probably enable it for the '@global' site as well (and also set other sites to default)
      if (this.settings.active.ui.inPlayer.activation === 'none' && !this.settings.active.ui.inPlayer.activateWithCtrl) {
        this.settings.active.sites['@global'].enableUI = ExtensionMode.Disabled;

        for (const site in this.settings.active.sites) {
          if (site.startsWith('@')) {
            continue;
          }
          this.settings.active.sites[site].enableUI = ExtensionMode.Default;
        }
      } else if (   // we set UI activation to any level of "there's a condition that causes UI trigger to be shown"
        this.settings.active.sites['@global'].enableUI === ExtensionMode.Disabled
        && ( this.settings.active.ui.inPlayer.activation !== 'none' || this.settings.active.ui.inPlayer.activateWithCtrl )
      ) {
        this.settings.active.sites['@global'].enableUI = ExtensionMode.Theater;

        for (const site in this.settings.active.sites) {
          if (site.startsWith('@')) {
            continue;
          }
          this.settings.active.sites[site].enableUI = ExtensionMode.Default;
        }
      }

      await this.settings.saveWithoutReload();

      this.eventBus.send('reload-menu');

      if (forceRefresh) {
        this.$nextTick( () => this.$forceUpdate() );
      }
    },
    startTriggerZoneEdit() {
      this.eventBus.send('start-trigger-zone-edit');
    },
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },


    /**
     * Carries set-ar / set-ar-zoom commands (and their shortcuts) between legacy and compact layouts.
     * Legacy: set-ar = crop, set-ar-zoom = zoom. Compact: set-ar only; no variant = crop.
     */
    migrateArShortcuts(source: any, target: any, toCompact: boolean) {
      if (!source || !target) {
        return;
      }

      const argKey = (args: any) => JSON.stringify([args?.type, args?.ratio ?? null, args?.offset ?? null]);
      const flatten = (cmds: any): any[] => Object.values(cmds).flatMap((x: any) => Array.isArray(x) ? x : []);
      const targetCmds = flatten(target);

      if (toCompact) {
        const editions: (ArVariant | undefined)[] = [undefined, ArVariant.Crop, ArVariant.None, ArVariant.Zoom];

        for (const srcCmd of flatten(source)) {
          if (srcCmd.action !== 'set-ar' && srcCmd.action !== 'set-ar-zoom') {
            continue;
          }
          const {variant, ...args} = srcCmd.arguments ?? {};
          const key = argKey(args);
          const shortcutEdition = srcCmd.action === 'set-ar-zoom' ? ArVariant.Zoom : undefined;

          for (const edition of editions) {
            let cmd = targetCmds.find(c => c.action === 'set-ar' && argKey(c.arguments) === key && c.arguments?.variant === edition);
            if (!cmd) {
              const {shortcut, ...rest} = srcCmd;
              cmd = {...rest, action: 'set-ar', arguments: edition === undefined ? {...args} : {...args, variant: edition}};
              target.crop?.push(cmd);
              targetCmds.push(cmd);
            }
            if (edition === shortcutEdition && srcCmd.shortcut) {
              cmd.shortcut = {...srcCmd.shortcut};
            }
          }
        }
        return;
      }

      // only commands without variant and with ArVariant.Zoom are carried back
      for (const srcCmd of flatten(source)) {
        if (srcCmd.action !== 'set-ar') {
          continue;
        }
        const {variant, ...args} = srcCmd.arguments ?? {};
        if (variant !== undefined && variant !== ArVariant.Zoom) {
          continue;
        }
        const action = variant === ArVariant.Zoom ? 'set-ar-zoom' : 'set-ar';
        const key = argKey(args);

        let cmd = targetCmds.find(c => c.action === action && argKey(c.arguments) === key);
        if (!cmd) {
          const {shortcut, ...rest} = srcCmd;
          cmd = {...rest, action, arguments: {...args}};
          target[variant === ArVariant.Zoom ? 'zoom' : 'crop']?.push(cmd);
          targetCmds.push(cmd);
        }
        if (srcCmd.shortcut) {
          cmd.shortcut = {...srcCmd.shortcut};
        }
      }
    },

    setPopupUIType(type: 'legacy' | 'compact') {
      if (!this.settings.active.ui.popup) {
        this.settings.active.ui.popup = {};
      }

      const prevCmd = this.settings.active.commands;

      if (type === 'compact') {
        this.settings.active.commandsLegacy = this.settings.active.commands;
        this.settings.active.commands = generateCommands();

        // shorten labels for 'zoom' commands:
        for (const cmd of this.settings.active.commands.zoom ?? []) {
          if (cmd.label) {
            cmd.label = cmd.label.replace('Zoom ', '');
            cmd.label = cmd.label.replace('Reset zoom', 'Reset');
          }
        }

        // shorten labels for 'stretch' commands:
        for (const cmd of this.settings.active.commands.stretch ?? []) {
          if (cmd.label) {
            cmd.label = cmd.label.replaceAll(' stretch ', '');
            cmd.label = cmd.label.replaceAll('Don\'t', 'None');
            cmd.label = cmd.label.replaceAll('Stretch t', 'T');
          }
        }
      } else {
        this.settings.active.commands = this.settings.active.commandsLegacy;
      }

      this.migrateArShortcuts(prevCmd, this.settings.active.commands, type === 'compact');

      this.settings.active.ui.popup.aspectRatioInterface = type;
      this.settings.save();
    },
  }
});
</script>
<style lang="postcss" scoped>
@reference "tailwindcss";

.ari-item {
  @apply p-4 h-96 w-96 flex flex-col justify-center items-center bg-black border-1 border-stone-700;

  &.active {
    @apply border-1 border-amber-300 bg-amber-300/10;
  }

  img {
    @apply grow shrink object-contain;
  }
  div {
    @apply mt-2 text-center h-24;
  }
}

.trigger-zone-editor {
  background-color: rgba(0,0,0,0.25);

  padding-bottom: 2rem;
  .field {
    margin-bottom: -1em;
  }
}

.disabled {
  pointer-events: none;
  /* color: #666; */
  filter: contrast(50%) brightness(40%) grayscale(100%);
}

.compact-form {
  > .field, > .field-group {
    margin-top: 0;
    margin-bottom: 0;
  }
}

.keyboard-settings {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;

  > * {
    width: calc(33% - 0.5rem);
  }
}

.mt2r {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}
.mth3 {
  margin-top: 1.5rem;
}
</style>
