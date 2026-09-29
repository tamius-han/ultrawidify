<template>
  <div class="flex flex-col h-full justify-center items-center">
    <template v-if="!settings || !settings.active">Please wait ...</template>
    <template v-else-if="!settingsSaved">

      <h1 class="text-[1.75rem] text-primary-300">
        Ultrawidify has been installed.
      </h1>
      <br/>
      <p>You now get to make some quick choices about how you want Ultrawidify to run. Close the tab when you're done.</p>
      <p>
        <small class="opacity-50">You <i>may</i> also just close this tab, but then don't complain when you don't like defaults.</small>
      </p>

      <div class="flex flex-col gap-4 mt-8">
        <div>
          <h2 class="!text-[1.25rem] text-primary-300">Where should Ultrawidify run?</h2>
        </div>
        <div class="flex flex-row gap-4 card-row">

          <div :class="{'active': enableOnSites === 'none'}" @click="setEnabledSites('none')">
            <h3>Only where you allow</h3>
            <div>
              For legacy/technical reason, Ultrawidify still gets 'access all websites' extension.
            </div>
         </div>

         <div :class="{'active': enableOnSites === 'official'}" @click="setEnabledSites('official')">
           <h3>On officially supported sites</h3>
           <div>
             Ultrawidify will run only on sites that are officially supported, and the websites you manually enable.
           </div>
         </div>

         <div :class="{'active': enableOnSites === 'community'}" @click="setEnabledSites('community')">
            <h3>Where people say it's working</h3>
            <div>
              You can report working websites on <a href="https://github.com/tamius-han/ultrawidify" target="_blank" class="hover:underline" @click="$event.stopPropagation()">github</a>.
            </div>
         </div>

          <div :class="{'active': enableOnSites === 'all'}" @click="setEnabledSites('all')">
            <h3>All websites</h3>
            <div>
              ... ish. Some websites are disabled by default.
            </div>
          </div>
        </div>

        <div>
          <h2 class="mt-4 !text-[1.25rem] text-primary-300">Try to automatically detect aspect ratio?</h2>
          <p>Note that automatic aspect ratio detection doesn't work on sites that use DRM or on sites that do CORS shenanigans.</p>
        </div>
        <div class="flex flex-row gap-4 card-row">
          <div :class="{'active': aardMode === 'crop'}" @click="setAardMode('crop')">
            <h3>Detect & Crop (contain)</h3>
            <div>
              Crops as much as possible without cutting off any parts of the video.
            </div>
          </div>
          <div :class="{'active': aardMode === 'zoom'}" @click="setAardMode('zoom')">
            <h3>Detect & Zoom (cover)</h3>
            <div>
              Zooms into the video to cover the entire player, potentially cropping parts of the video.
            </div>
          </div>
          <div :class="{'active': aardMode === 'disabled'}" @click="setAardMode('disabled')">
            <h3>Disable automatic detection</h3>
          </div>
        </div>

        <div>
          <h2 class="mt-4 !text-[1.25rem] text-primary-300">What to do when there's subtitles?</h2>
          <p>
            Note that subtitle detection is highly experimental. Current assumptions: 1. subtitles are
            either on the top or on the bottom, always centered, and never to the side; 2. text has latin characteristics
            (horizontal, at least ~5 characters per line, there is empty (dark) space between letters, characters aren't very wide)
          </p>
        </div>
        <div class="flex flex-row gap-4 card-row">
          <div :class="{'active': placeholderSubtitleCrop === AardSubtitleCropMode.CropSubtitles}" @click="setSubtitleCropMode(AardSubtitleCropMode.CropSubtitles)">
            <h3>Crop subtitles</h3>
            <div>Subtitles are ignored. Video will be cropped regardless of whether subtitles are detected or not.</div>
          </div>
          <div :class="{'active': placeholderSubtitleCrop === AardSubtitleCropMode.ResetAR}" @click="setSubtitleCropMode(AardSubtitleCropMode.ResetAR)">
            <h3>Stop cropping while subtitles are present</h3>
            <div>Cropping is paused only while subtitles are on screen, and also for some time after. Delay can be configured in settings.</div>
          </div>
          <div :class="{'active': placeholderSubtitleCrop === AardSubtitleCropMode.ResetAndDisable}" @click="setSubtitleCropMode(AardSubtitleCropMode.ResetAndDisable)">
            <h3>Stop cropping until end of video</h3>
            <div>If subtitles are detected, cropping will be stopped until the end of the video.</div>
          </div>
        </div>

        <div>
          <h2 class="mt-4 !text-[1.25rem] text-primary-300">What to do with in-player UI</h2>
          <p>
            In-player UI may not be visible if video player is not big enough.
            More configuration options can be found in the settings.
          </p>

          <div class="flex flex-row gap-4 card-row">

            <div :class="{'active': uwui === 'player'}" @click="setUIMode('player')">
              <h3>Show when moving mouse anywhere over video</h3>
              <div>
                In-player UI will be displayed whenever the mouse is moved over the video player. UI hides when mouse stops moving.
              </div>
            </div>

            <div :class="{'active': uwui === 'distance'}" @click="setUIMode('distance')">
              <h3>Show when mouse is close to activator</h3>
              <div>
                In-player UI will be displayed only when the mouse is near the activator element. UI hides when the mouse moves away or stops moving.
              </div>
            </div>

            <div :class="{'active': uwui === 'ctrl-mouse'}" @click="setUIMode('ctrl-mouse')">
              <h3>Show only when moving mouse and holding CTRL</h3>
              <div>
                In-player UI will only be shown while moving the mouse and holding the CTRL key.
              </div>
            </div>

            <div :class="{'active': uwui === 'none'}" @click="setUIMode('none')">
              <h3>Never show</h3>
              <div>
                UI is never visible, unless manually triggered from the extension popup.
              </div>
            </div>
          </div>
        </div>

        <!-- <div>
          <h2 class="mt-4 !text-[1.25rem] text-primary-300">Telemetry</h2>
          <p>
            Presently, no data is collected yet, because development of this addon is happening at glacial pace.
          </p>
          <p>
            However, if I ever get enough time to work on this addon in a bit more serious manner, it would help to know
            how this addon is being used in the real world. Especially since I've been burned by the difference between how
            I use this addon and how other people use this addon <i>several times</i>.
          </p>
          <p>
            This means that there's a chance some telemetry will be added to this addon at a later date.
          </p>
        </div>
        <div class="flex flex-row gap-4 card-row">
          <div>
            <h3>Share a lot</h3>
            <div>
              <ul>
                <li>which websites you use this extension on</li>
                <li>which features of this addon you use</li>
                <li>screen resolution(s) and aspect ratios of your devices</li>
              </ul>
              <p>Website usage data is anonymized — each site is reported separately, with a separate random identifier.</p>
            </div>
          </div>

          <div>
            <h3>Share a little</h3>
            <div>
              <ul>
                <li>which features of this addon you use</li>
                <li>screen resolution(s) and aspect ratios of your devices</li>
              </ul>
              <p>Website usage data is <b class="text-stone-100">not</b> collected.</p>
            </div>
          </div>

          <div>
            <h3>Share nothing</h3>
            <div>
              <p>No telemetry data is collected, but you relinquish your moral rights to complain if a feature is removed because "this feature is poorly coded unmaintainable spaghett that nobody uses anyway"</p>
            </div>
          </div>
        </div> -->
      </div>


      <div class="flex flex-row w-full justify-center items-center mt-16 mb-8">
        <button class="button primary" @click="placeboSaveSettings">
          Save settings
        </button>
      </div>
    </template>
    <template v-else>
      <h1 class="text-[1.75rem] text-primary-300">Your preferences have been saved.</h1>
      <p>
        You can always change or further customize your preferences in
        <a class="button primary" @click="redirectToFullSettings">
          extension settings
        </a>.
      </p>

    </template>
  </div>
</template>

<script lang="ts">
import { LogAggregator } from '@src/ext/module/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import { AardSubtitleCropMode } from '@src/ext/module/aard/enums/aard-subtitle-crop-mode.enum';
import { SiteSupportLevel } from '@src/common/enums/SiteSupportLevel.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import { ArVariant } from '@src/common/interfaces/ArInterface';

export default {
  props: [
    'settings',
  ],
  data () {
    return {
      AardSubtitleCropMode,
      ExtensionMode,
      settingsSaved: false,

      enableOnSites: 'all',
      aardMode: 'crop',
      placeholderSubtitleCrop: AardSubtitleCropMode.ResetAR,
      uwui: 'mouseover-player',
      telemetry: '',
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    // this.placeholderSubtitleCrop = (this.settings.active.aard.useLegacy ? this.settings.active.aardLegacy.subtitles?.subtitleCropMode : this.settings.active.aard.subtitles?.subtitleCropMode) ?? AardSubtitleCropMode.ResetAR;
    this.settingsInitialized = true;
    this.loadSettings();

    // Ensure that install screen is only shown once
    if (this.settings.active._installScreenShown && !this.settings.active.ui.devMode) {
      this.settingsSaved = true;
    }
    this.settings.active._installScreenShown = true;
    this.settings.save();
  },
  components: {
  },
  methods: {
    loadSettings() {
      this.enableOnSites = this.settings.active.lastEnableSitesPreset ?? 'all';

      if (
        this.settings.active.sites['@global'].defaults?.crop?.type !== AspectRatioType.Automatic
        && this.settings.active.sites['@global'].defaults?.stretch?.type !== AspectRatioType.Automatic
      ) {
        this.aardMode = 'disabled';
      } else if (
        this.settings.active.sites['@global'].defaults?.crop?.type === AspectRatioType.Automatic
      ) {
        this.aardMode = 'crop';
      } else if (
        this.settings.active.sites['@global'].defaults?.stretch?.type === AspectRatioType.Automatic
      ) {
        this.aardMode = 'stretch';
      } else {
        this.aardMode = 'disabled';
      }

      if (this.settings.active.sites['@global'].defaults!.crop!.type === AspectRatioType.Automatic) {
        if (this.settings.active.sites['@global'].defaults!.crop!.variant === ArVariant.Crop) {
          this.aardMode = 'crop';
        } else {
          this.aardMode = 'zoom';
        }
      } else {
        this.aardMode = 'disabled';
      }

      this.placeholderSubtitleCrop = this.settings.active.aard.subtitles.subtitleCropMode ?? AardSubtitleCropMode.ResetAR;

      const playerUiSettings = this.settings.active.ui.inPlayer;

      if (playerUiSettings.activation === 'none') {
        this.uwui = playerUiSettings.activateWithCtrl ? 'ctrl-mouse' : 'none';
      } else {
        switch (playerUiSettings.activation) {
          case 'player':
            this.uwui = 'player';
            break;
          case 'trigger-zone':
          case 'distance':
            this.uwui = 'distance';
            break;
          default:
            this.uwui = 'none';
            break;
        }

      }
    },

    setEnabledSites(preset: 'all' | 'official' | 'community' | 'none') {
      this.enableOnSites = preset;
      this.settings.active.lastEnableSitesPreset = preset;

      const activeSites = this.settings.active.sites;
      const defaultSites = this.settings.default.sites;

      activeSites['@global'].enable = preset === 'all' ? defaultSites['@global'].enable : ExtensionMode.Disabled;

      switch (preset) {
        case 'all':
          for (const siteKey in activeSites) {
            if (siteKey.startsWith('@')) {
              continue;
            }
            if (defaultSites[siteKey].defaultSupportLevel !== SiteSupportLevel.OfficialBlacklist) {
              activeSites[siteKey].enable = defaultSites[siteKey]?.enable ?? ExtensionMode.All;
            }
          }
          break;
        case 'community':
          for (const siteKey in activeSites) {
            if (siteKey.startsWith('@')) {
              continue;
            }
            if (
              defaultSites[siteKey].defaultSupportLevel === SiteSupportLevel.CommunitySupport
              || defaultSites[siteKey].defaultSupportLevel === SiteSupportLevel.OfficialSupport
            ) {
              activeSites[siteKey].enable = defaultSites[siteKey]?.enable ?? ExtensionMode.All;
            }
          }
          break;
        case 'official':
          for (const siteKey in activeSites) {
            if (siteKey.startsWith('@')) {
              continue;
            }
            if (defaultSites[siteKey].defaultSupportLevel === SiteSupportLevel.OfficialSupport) {
              activeSites[siteKey].enable = defaultSites[siteKey]?.enable ?? ExtensionMode.All;
            }
          }
          break;
        case 'none':
          for (const siteKey in activeSites) {
            if (siteKey.startsWith('@')) {
              continue;
            }
            activeSites[siteKey].enable = ExtensionMode.Disabled;
          }
          break;
      }

      this.settings.save();
    },

    setAardMode(mode: 'crop' | 'zoom' | 'disabled') {
      this.aardMode = mode;

      if (mode === 'disabled') {
        this.settings.active.sites['@global'].defaults!.crop! = {type: AspectRatioType.Initial};
      } else {
        this.settings.active.sites['@global'].defaults!.crop! = {type: AspectRatioType.Automatic, variant: mode === 'crop' ? ArVariant.Crop : ArVariant.Zoom };
      }
    },

    setSubtitleCropMode(crop: AardSubtitleCropMode) {
      this.settings.active.aard.subtitles.subtitleCropMode = crop;

      this.placeholderSubtitleCrop = crop;
      this.settings.save();
    },

    setUIMode(uwui: 'none' | 'player' | 'distance' | 'ctrl-mouse' ) {
      if (uwui === 'none') {
        this.settings.active.ui.inPlayer.activation = 'none';
        this.settings.active.ui.inPlayer.activateWithCtrl = false;
      } else {
        this.settings.active.ui.inPlayer.activateWithCtrl = true;
        if (uwui === 'ctrl-mouse') {
          this.settings.active.ui.inPlayer.activation = 'none';
        } else {
          this.settings.active.ui.inPlayer.activation = uwui;
        }
      }

      this.uwui = uwui;
      this.settings.save();
    },

    placeboSaveSettings() {
      this.settingsSaved = true;
    },

    async redirectToFullSettings() {
      await this.saveSettings();
      window.location.hash = '#settings';
      window.location.reload();
    },
    async updateConfig() {
      await this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    },
    async saveSettings() {
      // this.settings.active[this.settings.active.aard.useLegacy ? 'aardLegacy' : 'aard'].subtitles.subtitleCropMode = this.placeholderSubtitleCrop;
      await this.settings.save();
      this.settingsSaved = true;
    }
  }
}
</script>
<style lang="postcss" scoped>
@import '@src/main.css'; /** postcss processor doesn't support aliases */

.card-row {

  >div {
    @apply
      py-4 px-6 w-72
      flex flex-col justify-between
      text-stone-400 text-sm
      bg-black/75 border border-stone-500;

    border-radius: 0.25rem;

    &:hover {
      @apply bg-primary-400/10 text-stone-200 border-primary-400;
    }

    &.active {
      @apply bg-primary-400 text-stone-700 border-primary-400;

      h3 {
        @apply text-stone-900;
      }
    }

    h3 {
      @apply block text-[1rem] font-bold text-primary-400 border-b-0 mb-4 mt-0 pt-0;
    }



  }
}
</style>

