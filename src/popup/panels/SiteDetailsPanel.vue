<template>
  <div class="flex flex-column" style="padding-bottom: 20px; position: relative">
    <!-- <div class="">
      <div class="label">Player picker</div>
      <div class="desc">
        If extension doesn't detect player correctly, you can override it.
        <small>(NOTE: this currently doesn't work for embedded videos)</small>
      </div>

      <div>Meaning of outlines:</div>

      <div class="flex flex-row flex-wrap">
        <div class="pp_video flex flex-nogrow"><code>&lt;video&gt;</code>&nbsp;element</div>
        <div class="pp_current flex flex-nogrow">Selected and not matched</div>
        <div class="pp_matched flex flex-nogrow">Elements that match query selector</div>
        <div class="pp_current_matched">Selected and matched, selector ok</div>
        <div class="pp_match_children">Selected and matched, selector too vague</div>
      </div>

      <div class="flex flex-row">
        <ShortcutButton label="Move up"
        />
        <ShortcutButton label="Move down"
        />
      </div>
      <div class="flex flex-row flex-wrap">
        <QsElement selector="#test_id" />
        <QsElement selector=".test_class" />
        <template v-for="qse of currentElementQs" >
          <QsElement :selector="qse" :key="qse" />
        </template>
      </div>
    </div> -->

    <div class="label">
      Player detection settings<br/><small>for {{site}}</small>
    </div>
    <div class="description">
      If extension doesn't work, you can help a little by telling it where to look for the player.<br/>
    </div>
    <div class="">
      <div class="">
        <input :checked="playerManualQs"
                @change="togglePlayerManualQs"
                type="checkbox"
        /> Manually specify player
        <span v-if="playerManualQs" class="small-samecolor">
          &nbsp;
          <a
            v-if="playerByNodeIndex"
            @click="toggleByNodeIndex"
          >(use advanced options)</a>
          <a
            v-if="!playerByNodeIndex"
            @click="toggleByNodeIndex"
          >(use basic options)</a>
        </span>
      </div>

      <div v-if="playerManualQs">
        <div v-if="!playerByNodeIndex" class="flex flex-column">
          <div class="">Query selectors for player:</div>
          <input type="text"
                v-model="playerQs"
                @change="updatePlayerQuerySelector"
                @blur="updatePlayerQuerySelector"
                :disabled="playerByNodeIndex || !playerManualQs"
          />
        </div>

        <div v-if="playerByNodeIndex" class="flex flex-row">
          <div>
            Player is n-th parent of video:
          </div>
          <input v-model="playerParentNodeIndex"
                  :disabled="!playerManualQs"
                  @change="updatePlayerParentNodeIndex"
                  @blur="updatePlayerParentNodeIndex"
                  type="number"
          />
        </div>

        <div class="description">
          <small>
            <b>Hint:</b> Player is a HTML element that represents the portion of the page you expect the video to play in.
            The correct value for n-th player value should normally between 1-10 (depends on the site). If none of these
            values works, then the site probably has a different issue.
            Note that you need to save settings and reload the page every time you change the number.
          </small>
        </div>
      </div>


      <div class="flex flex-row">
        <input :checked="usePlayerAr"
                @change="toggleUsePlayerAr"
                type="checkbox"
        />
        <div>
          Do not use monitor AR in fullscreen
        </div>
      </div>

      <div class="description">
        <small>
          <b>Hint:</b> When in full screen, the extension will assume that player element is as big as your screen.
          You generally want to keep this option off, unless you like to browse in fullscreen a lot.
        </small>
      </div>
    </div>

    <div class="label">
      Additional css<br/><small>for {{site}}</small>
    </div>
    <div class="description">
      This css will be inserted into webpage every time it loads.
    </div>
    <div class="flex flex-column">
        <textarea
               v-model="playerCss"
               @change="updatePlayerCss"
               @blur="updatePlayerCss"
        >
        </textarea>
    </div>

    <div class="label">
      Video detection settings<br/><small>for {{site}}</small>
    </div>
    <div class="description">Video is just the moving picture bit without the player.</div>
    <div class="">
      <div class="">
        <input :checked="!videoManualQs"
                @change="toggleVideoManualQs"
                type="checkbox"
        /> Detect automatically
      </div>
      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Query selectors</div>
        <input type="text"
               v-model="videoQs"
               :disabled="!videoManualQs"
               @change="updateVideoQuerySelector"
               @blur="updateVideoQuerySelector"
        />
      </div>
      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Additional style for video element</div>
        <input type="text"
               v-model="videoCss"
               @change="updateVideoCss"
               @blur="updateVideoCss"
        />
      </div>

      <div class="label">
        Browser quirk mitigations
      </div>
      <div class="description">
        Sometimes, the extension may misbehave as a result of issues and bugs present in your browser, operating system or your GPU driver.
        Some of the issues can be fixed by limiting certain functionalities of this addon.
      </div>
      <div class="flex flex-column">
        <div
          v-if="BrowserDetect.anyChromium"
          class="workaround flex flex-column"
        >
          <div class="flex label-secondary form-label">
            <input :checked="settings?.active?.mitigations?.zoomLimit?.enabled"
                  @change="setMitigation(['zoomLimit', 'enabled'], $event.target.checked)"
                  type="checkbox"
            /> Limit zoom.
          </div>
          <div class="flex flex-row">
            <div class="label-secondary form-label">
              <small>Limit zoom to % of width (1=100%):</small>
            </div>
            <input type="number"
                  :value="settings?.active?.mitigations?.zoomLimit?.limit || 0.997"
                  step="0.001"
                  min="0.5"
                  @change="setMitigation(['zoomLimit', 'limit'], +$event.target.value)"
                  @blur="updateVideoQuerySelector"
                  :disabled="!settings?.active?.mitigations?.zoomLimit?.enabled"
            />
          </div>
          <div class="flex label-secondary form-label">
            <input :checked="settings?.active?.mitigations?.zoomLimit?.fullscreenOnly"
                  @change="setMitigation(['zoomLimit', 'fullscreenOnly'], $event.target.checked)"
                  :disabled="!settings?.active?.mitigations?.zoomLimit?.enabled"
                  type="checkbox"
            /> Limit zoom only while in fullscreen
          </div>
          <div class="description">
            <small>
              <b>Fix for:</b> Chrome and Edge used to have a bug where videos would get incorrectly stretched when zoomed in too far.
              The issue only appeared in fullscreen, on nVidia GPUs, and with hardware acceleration enabled. While this option only
              needs to be applied in fullscreen, fullscreen detection in Chrome can be a bit unreliable (depending on your OS and/or
              display scaling settings). <a href="https://stuff.tamius.net/sacred-texts/2021/02/01/ultrawidify-and-chrome-2021-edition/" target="_blank">More about the issue</a>.
            </small>
          </div>
        </div>
      </div>

      <div>&nbsp;</div>

      <div>&nbsp;</div>

    </div>
    <div id="save-banner-observer-bait">
      &nbsp;
    </div>
    <div
      id="save-banner"
      class="save-banner"
    >
      <div class="button">Save settings</div>
    </div>
  </div>
</template>

<script>
import ShortcutButton from '../../common/components/ShortcutButton.vue';
import QsElement from '../../common/components/QsElement.vue';
import QuerySelectorSetting from '../../common/components/QuerySelectorSetting.vue';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import StretchType from '../../common/enums/StretchType.enum';
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  components: {
    QuerySelectorSetting,
    ShortcutButton,
    QsElement,
  },
  data() {
    return {
      videoManualQs: false,
      videoQs: '',
      videoCss: '',
      playerManualQs: false,
      playerQs: '',
      playerCss: '',
      playerByNodeIndex: true,
      playerParentNodeIndex: undefined,
      usePlayerAr: false,
      BrowserDetect
    };
  },
  props: {
    site: String,
    siteSettings: Object,
  },
  created() {
    try {
      this.videoManualQs = this.siteSettings.data.currentDOMConfig?.elements?.video?.manual ?? this.videoManualQs;
      this.videoQs = this.siteSettings.data.currentDOMConfig?.elements?.video?.querySelectors;
      this.videoCss = this.siteSettings.data.currentDOMConfig?.elements?.video?.nodeCss;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }

    try {
      this.playerManualQs = this.siteSettings.data.currentDOMConfig?.elements?.player?.manual ?? this.playerManualQs;
      this.playerQs = this.siteSettings.data.currentDOMConfig?.elements?.player?.querySelectors;
      this.playerByNodeIndex = !this.siteSettings.data.currentDOMConfig?.elements?.player?.querySelectors || this.playerByNodeIndex;
      this.playerParentNodeIndex = this.siteSettings.data.currentDOMConfig?.elements?.player?.index;
      // this.usePlayerAr = this.settings.active.sites[this.site]?.usePlayerArInFullscreen;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }

    try {
      this.playerCss = this.settings.active.sites[this.site].css || '';
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }
  },
  mounted() {
    this.createObserver();
  },
  methods: {
    createObserver() {
      const saveButtonBait = document.getElementById('save-banner-observer-bait');
      const saveButton = document.getElementById('save-banner');

      const observer = new IntersectionObserver(
        ([e]) => {
          // console.log('observer triggered. intersection ratio?', e.intersectionRatio)
          saveButton.classList.toggle('floating', e.intersectionRatio < 0.95);
        },
        {threshold: [0, 0.5, 0.9, 0.95, 1]}
      );

      observer.observe(saveButtonBait);
    },
    updateVideoQuerySelector() {
      this.siteSettings.set('currentDOMConfig')
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.querySelectors = this.videoQs;
      this.settings.save();
    },
    updateVideoCss() {
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.additionalCss = this.videoCss;
      this.settings.save();
    },
    updatePlayerQuerySelector() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.querySelectors = this.playerQs;
      this.settings.save();
    },
    updatePlayerCss() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].css = this.playerCss;
      this.settings.save();
    },
    updatePlayerParentNodeIndex() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.videoAncestor = this.playerParentNodeIndex;
      this.settings.save();
    },
    toggleVideoManualQs() {
      this.ensureSettings('video');
      this.videoManualQs = !this.videoManualQs;
      this.settings.active.sites[this.site].DOM.video.manual = this.videoManualQs;
      this.settings.save();
    },
    togglePlayerManualQs() {
      this.ensureSettings('player');
      this.playerManualQs = !this.playerManualQs;
      this.settings.active.sites[this.site].DOM.player.manual = this.playerManualQs;
      this.settings.save();
    },
    toggleByNodeIndex() {
      this.ensureSettings('player');
      this.playerByNodeIndex = !this.playerByNodeIndex;
      this.settings.active.sites[this.site].DOM.player.useRelativeAncestor = this.playerByNodeIndex;
      this.settings.save();
    },
    toggleUsePlayerAr() {
      this.ensureSettings('player');
      this.usePlayerAr = !this.usePlayerAr;
      this.settings.active.sites[this.site].usePlayerArInFullscreen = this.usePlayerAr;
      this.settings.save();
    },
    setMitigation(mitigation, value) {
      // ensure mitigations object exists.
      // it may not exist in the settings on first load
      if (! this.settings.active.mitigations) {
        this.settings.active.mitigations = {};
      }

      if (Array.isArray(mitigation)) {
        let currentMitigationsParent = this.settings.active.mitigations;

        for (let i = 0; i < mitigation.length - 1; i++) {
          if (!currentMitigationsParent[mitigation[i]]) {
            currentMitigationsParent[mitigation[i]] = {};
          }
          currentMitigationsParent = currentMitigationsParent[mitigation[i]];
        }

        currentMitigationsParent[mitigation[mitigation.length - 1]] = value;

      } else {
        this.settings.active.mitigations[mitigation] = value;
      }

      this.settings.save();
    }
  }

}
</script>

<style lang="scss">
@import '../../res/css/colors.scss';

.pp_video {
  margin: 2px;
  padding: 5px;
  border: 1px solid #00f;
}
.pp_current {
  margin: 2px;
  padding: 5px;
  border: 1px solid #88f;
}
.pp_matched {
  margin: 2px;
  padding: 5px;
  border: 1px dashed #fd2;
}
.pp_current_matched {
  margin: 2px;
  padding: 2px;
  border: 2px solid #027a5c;
}
.pp_match_children {
  margin: 2px;
  padding: 2px;
  border: 2px solid #f00;
}

.save-banner {
  display: block;
  position: sticky;
  bottom: 0px;
  left: 0px;
  right: 0px;
  background-color: #131313;
  text-align: center;

  &.floating {
    box-shadow: 0 2rem 3rem 1rem $selected-color;
  }
}

.small-samecolor {
  font-size: 0.8em;
}
</style>
