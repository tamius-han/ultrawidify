<template>
  <div>
    <h3>Extension settings</h3>
    <div class="field">
      <div class="label">
        Enable extension under the following conditions:
      </div>
      <ul>
        <li>while in full screen</li>
        <li>while in theater mode</li>
        <li>during normal playback</li>
      </ul>
    </div>

    <div class="field">
      <div class="label">
        Enable automatic aspect ratio detection under the following conditions:
      </div>
      <ul>
        <li>while in full screen</li>
        <li>while in theater mode</li>
        <li>during normal playback</li>
      </ul>
      <div class=""></div>
    </div>

    <div class="field">
      <div class="label">Default crop:</div>
      <div class="select">
        <select
          v-model="siteDefaultCrop"
          @click="setOption('defaultCrop', $event)"
        >
          <option
            v-if="site !== '@global'"
            :value="undefined"
          >
            Use default ({{defaultCrop}})
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

    <div class="field">
      <div class="label">Default stretch:</div>
      <div class="select">
        <select
          v-model="siteDefaultStretchMode"
          @click="setOption('defaultStretch', $event)"
        >
          <option
            v-if="site !== '@global'"
            :value="undefined"
          >
            Use default ({{defaultStretch}})
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

    <div class="field">
      <div class="label">Persist crop mode between videos</div>
      <div class="select">
        <select
          v-model="siteDefaultCropModePersistence"
          @click="setOption('cropModePersistence')"
        >
          <option
            v-if="site !== '@global'"
            :value="CropModePersistence.Default"
          >
            Use default ({{defaultCropPersistence}})
          </option>
          <option :value="CropModePersistence.Disabled">Disabled</option>
          <option :value="CropModePersistence.UntilPageReload">Until page reload</option>
          <option :value="CropModePersistence.CurrentSession">Current session</option>
          <option :value="CropModePersistence.Forever">Always persist</option>
        </select>
      </div>
    </div>

    <div class="field">
      <div class="label">Persist stretch mode between videos (TODO — this is not yet implemented)</div>
      <div class="select">
        <select
          v-model="siteDefaultCropModePersistence"
          @click="setOption('cropModePersistence')"
        >
          <option
            v-if="site !== '@global'"
            :value="CropModePersistence.Default"
          >
            Use default ({{defaultCropPersistence}})
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
import CropModePersistence from './../../../../../common/enums/CropModePersistence.enum';

export default {
  data() {
    return {
      CropModePersistence: CropModePersistence,
    }
  },
  mixins: [

  ],
  props: [
    'settings',
    'site',
    'isDefaultConfiguration'
  ],
  components: {

  },
  computed: {
    siteDefaultCrop() {
      return JSON.stringify(
        this.settings?.getDefaultCrop(this.site) ?? {type: this.site === '@global' ? AspectRatioType.Automatic : AspectRatioType.Default}
      );
    },
    siteDefaultStretch() {
      return JSON.stringify(
        this.settings?.getDefaultStretch(this.site) ?? {type: this.site === '@global' ? StretchMode.NoStretch : StretchMode.Default}
      );
    },
    siteDefaultCropPersistence() {
      return CropModePersistence.Default;
      // this.settings?.getDefaultCropPersistence(this.site) ?? {type: this.site === '@global' ? CropModePersistence.Disabled : CropModePersistence.Default}
    },
    siteDefaultFullScreenOnly() {
      return undefined;
      // return this.settings.getDefaultRestriction(this.site, 'onlyAllowInFullscreen');
    },
    siteDefaultAardFullScreenOnly() {
      return undefined;
      // return this.settings.getDefaultRestriction(this.site, 'onlyAllowAutodetectionInFullscreen')
    },
    defaultCrop() {
      return 'parse me';
    },
    defaultStretch() {
      return 'parse me';
    },
    defaultCropPersistence() {
      return 'parse me';
    },
    defaultFullScreenOnly() {
      return 'parse me';
    },
    defaultAardFullScreenOnly() {
      return 'parse me';
    }
  },
  methods: {
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

      if (!this.settings.active.sites[this.site]) {
        this.settings.active.sites[this.site] = this.settings.getDefaultSiteConfiguration();
      }

      const optionPath = option.split('.');
      if (optionPath.length < 2) {
        this.settings.active.sites[this.site][option] = commandArguments;
      } else {
        let currentOptionObject = this.settings.active.sites[this.site][optionPath[0]];
        let i;
        for (i = 1; i < optionPath.length - 1; i++) {
          if (currentOptionObject[optionPath[i]] === undefined) {
            currentOptionObject[optionPath[i]] = {};
          }
          currentOptionObject = currentOptionObject[optionPath[i]];
        }
        currentOptionObject[optionPath[optionPath.length - 1]] = commandArguments;
      }

      this.settings.saveWithoutReload();
    }
  }

}
</script>

<style lang="scss" src="../../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../../../res-common/panels.scss" scoped></style>
<style lang="scss" src="../../../res-common/common.scss" scoped></style>
