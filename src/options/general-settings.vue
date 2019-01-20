<template>
  <div>
    <div class="label">
      Enable this extension:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Always"
              :selected="settings.active.sites['@global'] === ExtensionMode.Enabled"
              @click.native="setDefaultExtensionMode(ExtensionMode.Enabled)"
      > 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.sites['@global'] === ExtensionMode.Whitelist"
              @click.native="setDefaultExtensionMode(ExtensionMode.Whitelist)"
      >
      </Button>
      <Button label="Never"
              :selected="settings.active.sites['@global'] === ExtensionMode.Disabled"
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
              :selected="settings.active.site['@global'].autoar === ExtensionMode.Enabled"
              @click.native="setDefaultAutodetectionMode(ExtensionMode.Enabled)"> 
      </Button>
      <Button label="On whitelisted sites"
              :selected="settings.active.site['@global'].autoar === ExtensionMode.Whitelist"
              @click.native="setDefaultAutodetectionMode(ExtensionMode.Whitelist)">
      </Button>
      <Button label="Never"
              :selected="settings.active.site['@global'].autoar === ExtensionMode.Disabled"
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
              :selected="settings.active.site['@global'].videoAlignment === VideoAlignment.Left"
              @click.native="setDefaultvideoAlignment(VideoAlignment.Left)"> 
      </Button>
      <Button label="Center"
              :selected="settings.active.site['@global'].videoAlignment === VideoAlignment.Center"
              @click.native="setDefaultvideoAlignment(VideoAlignment.Center)">
      </Button>
      <Button label="Right"
              :selected="settings.active.site['@global'].videoAlignment === VideoAlignment.Right"
              @click.native="setDefaultvideoAlignment(VideoAlignment.Right)">
      </Button>
    </div>

    <div class="label">
      Default stretch mode:
    </div>
    <div class="flex flex-row button-box">
      <Button label="Don't stretch"
              :selected="settings.active.site['@global'].stretch === StretchMode.NoStretch"
              @click.native="setDefaultStretchingMode(StretchMode.NoStretch)"> 
      </Button>
      <Button label="Basic stretch"
              :selected="settings.active.site['@global'].stretch === StretchMode.Basic"
              @click.native="setDefaultStretchingMode(StretchMode.Basic)">
      </Button>
      <Button label="Hybrid stretch"
              :selected="settings.active.site['@global'].stretch === StretchMode.Hybrid"
              @click.native="setDefaultStretchingMode(StretchMode.Hybrid)">
      </Button>
      <Button label="Thin borders only"
              :selected="settings.active.site['@global'].stretch === StretchMode.Conditional"
              @click.native="setDefaultStretchingMode(StretchMode.Conditional)"
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
import StretchMode from '../common/enums/stretch.enum';
import ExtensionMode from '../common/enums/extension-mode.enum';
import VideoAlignment from '../common/enums/video-alignment.enum';

export default {
  components: {
    Button,
  },
  data () {
    return {
      StretchMode: StretchMode,
      ExtensionMode: ExtensionMode,
      VideoAlignment: VideoAlignment,
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
      this.settings.active.site['@global'].autoar = mode;
      this.settings.save();
    },
    setDefaultExtensionMode(mode) {
      this.settings.active.sites['@global'] = mode;
      this.settings.save();
    },
    setDefaultvideoAlignment(mode) {
      this.settings.active.videoAlignment = mode;
      this.settings.save();
    },
    setDefaultStretchingMode(mode) {
      this.settings.active.site['@global'].stretch = mode;
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

