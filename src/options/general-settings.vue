<template>
  <div>
    <div class="label">
      Enable this extension:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Always"
              :selected="settings.active.extensionMode === 'blacklist'"
              @click.native="setDefaultExtensionMode('blacklist')"
      > 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.extensionMode === 'whitelist'"
              @click.native="setDefaultExtensionMode('whitelist')"
      >
      </Button>
      <Button label="Never"
              :selected="settings.active.extensionMode === 'disabled'"
              @click.native="setDefaultExtensionMode('disabled')"
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
              :selected="settings.active.arDetect.mode === 'blacklist'"
              @click.native="setDefaultAutodetectionMode('blacklist')"> 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.arDetect.mode === 'whitelist'"
              @click.native="setDefaultAutodetectionMode('whitelist')">
      </Button>
      <Button label="Never"
              :selected="settings.active.arDetect.mode === 'disabled'"
              @click.native="setDefaultAutodetectionMode('never')">
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
              :selected="settings.active.miscSettings.videoFloat === 'left'"
              @click.native="setDefaultVideoFloat('left')"> 
      </Button>
      <Button label="Center"
              :selected="settings.active.miscSettings.videoFloat === 'center'"
              @click.native="setDefaultVideoFloat('center')">
      </Button>
      <Button label="Right"
              :selected="settings.active.miscSettings.videoFloat === 'right'"
              @click.native="setDefaultVideoFloat('right')">
      </Button>
    </div>

    <div class="label">
      Default stretch mode:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Don't stretch"
              :selected="settings.active.stretch.initialMode === StretchMode.NO_STRETCH"
              @click.native="setDefaultStretchingMode(StretchMode.NO_STRETCH)"> 
      </Button>
      <Button label="Basic stretch"
              :selected="settings.active.stretch.initialMode === StretchMode.BASIC"
              @click.native="setDefaultStretchingMode(StretchMode.BASIC)">
      </Button>
      <Button label="Hybrid stretch"
              :selected="settings.active.stretch.initialMode === StretchMode.HYBRID"
              @click.native="setDefaultStretchingMode(StretchMode.HYBRID)">
      </Button>
      <Button label="Thin borders only"
              :selected="settings.active.stretch.initialMode === StretchMode.CONDITIONAL"
              @click.native="setDefaultStretchingMode(StretchMode.CONDITIONAL)"
      >
      </Button>
    </div>
    <div class="description">
      <b>None:</b> do not stretch the video at all. This is the default option, for men of culture.<br/>
      <b>Basic:</b> stretches video to fit the player or screen unconditionally. If video has letterbox encoded, this option <i>will not</i> try to remove letterbox before stretching. You probably shouldn't be using this option.<br/>
      <b>Hybrid:</b> stretches the video to fit the player, but only if cropping didn't completely remove the black bars.<br/>
      <b>Thin borders:</b> stretches only if the width of black borders after cropping is thin.
      <br/>
      Treshold for thin borders can be defined below.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary">
          Thin border treshold:
        </div>
        <div class="flex flex-input">
          <input type="number"
                step="any"
                :value="settings.active.stretch.conditionalDifferencePercent"
                @input="updateStretchTreshold($event.target.value)"
                >
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import Button from '../common/components/button';
import StretchMode from '../common/enums/stretch-mode';

export default {
  components: {
    Button,
  },
  data () {
    return {
      StretchMode: StretchMode,
      stretchThreshold: 0,
    }
  },
  created () {
  },
  props: {
    settings: Object
  },
  methods: {
    setDefaultAutodetectionMode(mode) {
      this.settings.active.arDetect.mode = mode;
      this.settings.save();
    },
    setDefaultExtensionMode(mode) {
      this.settings.active.extensionMode = mode;
      this.settings.save();
    },
    setDefaultVideoFloat(mode) {
      this.settings.active.videoFloat = mode;
      this.settings.save();
    },
    setDefaultStretchingMode(mode) {
      this.settings.active.stretch.initialMode = mode;
      this.settings.save();
    },
    updateStretchTreshold(newTreshold) {
      if (!newTreshold || isNaN(newTreshold)) {
        return;
      }
      this.settings.active.stretch.conditionalDifferencePercent = newTreshold;
      this.settings.save();
    }
  }
}
</script>

