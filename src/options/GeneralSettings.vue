<template>
  <div>
    <div class="label">
      Enable this extension:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Always"
              :selected="settings.active.sites['@global'].mode === ExtensionMode.Enabled"
              @click.native="setDefaultExtensionMode(ExtensionMode.Enabled)"
      > 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.sites['@global'].mode === ExtensionMode.Whitelist"
              @click.native="setDefaultExtensionMode(ExtensionMode.Whitelist)"
      >
      </Button>
      <Button label="Never"
              :selected="settings.active.sites['@global'].mode === ExtensionMode.Disabled"
              @click.native="setDefaultExtensionMode(ExtensionMode.Disabled)"
      >
      </Button>
    </div>
    <div class="description">
      <b>Always</b> enables this extension on every site you visit that you didn't blacklist.<br/>
      <b>On whitelisted sites</b> enables this extension only on sites you explicitly whitelisted.<br/> 
      <b>Never</b> disables extension on all sites, even on those you whitelisted.
    </div>

    <div class="label">
      Enable autodetection:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Always" 
              :selected="settings.active.sites['@global'].autoar === ExtensionMode.Enabled"
              @click.native="setDefaultAutodetectionMode(ExtensionMode.Enabled)"> 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.sites['@global'].autoar === ExtensionMode.Whitelist"
              @click.native="setDefaultAutodetectionMode(ExtensionMode.Whitelist)">
      </Button>
      <Button label="Never"
              :selected="settings.active.sites['@global'].autoar === ExtensionMode.Disabled"
              @click.native="setDefaultAutodetectionMode(ExtensionMode.Disabled)">
      </Button>
    </div>
    <div class="description">
      <b>Always</b> enables autodetection on every site this extension is enabled for, unless blacklisted.<br/>
      <b>On whitelisted sites</b> enables autodetection only for sites that you explicitly enabled.<br/>
      <b>Never</b> disables autodetection on all sites, even on those you whitelisted.<br/>
      <!-- <br/> -->
      <!-- For more settings related to autodetection, please check the 'Autodetection' tab. -->
    </div>


    <div class="label">
      Default video alignment:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Left" 
              :selected="settings.active.sites['@global'].videoAlignment === VideoAlignmentType.Left"
              @click.native="setDefaultvideoAlignment(VideoAlignmentType.Left)"> 
      </Button>
      <Button label="Center"
              :selected="settings.active.sites['@global'].videoAlignment === VideoAlignmentType.Center"
              @click.native="setDefaultvideoAlignment(VideoAlignmentType.Center)">
      </Button>
      <Button label="Right"
              :selected="settings.active.sites['@global'].videoAlignment === VideoAlignmentType.Right"
              @click.native="setDefaultvideoAlignment(VideoAlignmentType.Right)">
      </Button>
    </div>

    <div class="label">
      Default stretch mode:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Don't stretch"
              :selected="settings.active.sites['@global'].stretch === StretchType.NoStretch"
              @click.native="setDefaultStretchingMode(StretchType.NoStretch)"> 
      </Button>
      <Button label="Basic stretch"
              :selected="settings.active.sites['@global'].stretch === StretchType.Basic"
              @click.native="setDefaultStretchingMode(StretchType.Basic)">
      </Button>
      <Button label="Hybrid stretch"
              :selected="settings.active.sites['@global'].stretch === StretchType.Hybrid"
              @click.native="setDefaultStretchingMode(StretchType.Hybrid)">
      </Button>
      <Button label="Thin borders only"
              :selected="settings.active.sites['@global'].stretch === StretchType.Conditional"
              @click.native="setDefaultStretchingMode(StretchType.Conditional)"
      >
      </Button>
    </div>
    <div class="description">
      <b>None:</b> do not stretch the video at all. This is the default option, for men of culture.<br/>
      <b>Basic:</b> stretches video to fit the player or screen unconditionally. If video has letterbox encoded, this option <i>will not</i> try to remove letterbox before stretching. You probably shouldn't be using this option.<br/>
      <b>Hybrid:</b> stretches the video to fit the player, but only if cropping didn't completely remove the black bars.<br/>
      <b>Thin borders:</b> stretches only if the width of black borders after cropping is thin.
      <br/>
      Threshold for thin borders can be defined below.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary">
          Thin border threshold:
        </div>
        <div class="flex flex-input">
          <input type="number"
                step="any"
                :value="settings.active.stretch.conditionalDifferencePercent"
                @input="updateStretchThreshold($event.target.value)"
                >
        </div>
      </div>
    </div>

    <div class="label">
      Import, export, reset settings
    </div>
    <div class="flex flex-column">
      <div v-if="downloadPermissionError"
          class="w100 center-text warning-lite"
      >
        Exporting settings requires the 'downloads' permission. (If you want to export settings without granting 'downloads' permission, you can copy-paste settings from 'Super advanced settings' tab)
      </div>
      <div v-if="corruptedSettingsError"
          class="w100 center-text warning-lite"
      >
        Settings import failed. The settings file is probably corrupted.
      </div>
      <div class="flex flex-row button-box">
        <div class="button center-text flex flex-auto">
          <label for="file-upload" class="w100 h100 block">
            Import settings
          </label>
          <input id="file-upload" 
                type="file"
                @input="importSettings"       
          />
        </div>
        <Button label="Export settings"
                @click.native="exportSettings()"
        />
        <Button label="Reset settings"
                @click.native="resetSettings()"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Button from '../common/components/Button';
import StretchType from '../common/enums/StretchType.enum';
import ExtensionMode from '../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../common/enums/VideoAlignmentType.enum';
import BrowserDetect from '../ext/conf/BrowserDetect';

export default {
  components: {
    Button,
  },
  props: {
    settings: Object
  },
  data () {
    return {
      StretchType: StretchType,
      ExtensionMode: ExtensionMode,
      VideoAlignmentType: VideoAlignmentType,
      stretchThreshold: 0,
      corruptedSettingsError: false,
      downloadPermissionError: false,
    }
  },
  created () {
  },
  methods: {
    setDefaultAutodetectionMode(mode) {
      this.settings.active.sites['@global'].autoar = mode;
      this.settings.save();
    },
    setDefaultExtensionMode(mode) {
      this.settings.active.sites['@global'].mode = mode;
      this.settings.save();

    },
    setDefaultvideoAlignment(mode) {
      this.settings.active.sites['@global'].videoAlignment = mode;
      this.settings.save();
    },
    setDefaultStretchingMode(mode) {
      this.settings.active.sites['@global'].stretch = mode;
      this.settings.save();
    },
    updateStretchThreshold(newThreshold) {
      if (!newThreshold || isNaN(newThreshold)) {
        return;
      }
      this.settings.active.stretch.conditionalDifferencePercent = newThreshold;
      this.settings.save();
    },
    resetSettings() {
      this.settings.active = JSON.parse(JSON.stringify(this.settings.default));
      this.settings.save();
    },
    async exportSettings() {
      this.downloadPermissionError = false;

      const blob = new Blob([JSON.stringify(this.settings.active)], {type: 'application/json'});
      const fileUrl = URL.createObjectURL(blob);
      
      try {
        if (BrowserDetect.firefox) {
          // reminder — webextension-polyfill doesn't seem to work in vue!
          await browser.permissions.request({permissions: ['downloads']});
          browser.downloads.download({saveAs: true, filename: 'ultrawidify-settings.json', url: fileUrl});
        } else if (BrowserDetect.anyChromium) {
          const ths = this;
          
          chrome.permissions.request(
            {permissions: ['downloads']},
            (granted) => {
              if (granted) {
                ths.exportSettingsChrome(fileUrl);
              } else {
                ths.downloadPermissionError = true
              }
            } 
          )
        }
      } catch (e) {
        this.downloadPermissionError = true;
      }
    },
    exportSettingsChrome(fileUrl){
      chrome.downloads.download({saveAs: true, filename: 'ultrawidify-settings.json', url: fileUrl});
    },
    async importSettings($event) {
      let file, text, settingsObj;
      this.corruptedSettingsError = false;
      
      try {
        file = $event.target.files[0];
      } catch (e) {
        console.error("error grabbing a file!");
        this.corruptedSettingsError = true;
        return;
      }

      try {
        text = await file.text();
        settingsObj = JSON.parse(text);
      } catch (e) {
        console.error("error parsing file to json");
        this.corruptedSettingsError = true;
        return;
      }

      // validate settings 
      for (const key in this.settings.default) {
        if (!settingsObj[key]) {
          console.error("corrupted settings!")
          this.corruptedSettingsError = true;
          return;
        }
      }

      this.settings.active = settingsObj;
      this.settings.save();
    }
  }
}
</script>

<style lang="scss" scoped>
input[type="file"] {
    display: none;
}
</style>
