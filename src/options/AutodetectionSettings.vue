<template>
  <div>
    <h2>Quick settings</h2>

    <div class="flex label-secondary">
      How often should autodetection check for changes?
    </div>
    <div class="description">
      Shorter intervals (left side of the slider) are more responsive to changes in aspect ratio detections,
      but requires more system resources. Slider is logarithmic.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex flex-input">
          More often&nbsp;<small>(~60/s)</small>
          <input type="range"
                 :value="Math.log(settings.active.arDetect.timers.playing)"
                 @change="setArCheckFrequency($event.target.value)"
                 min="2.3"
                 max="9.3"
                 step="any"
          />
          &nbsp; Less often&nbsp;<small>(~1/10s)</small>
        </div>
      </div>
    </div>
    <div class="flex label-secondary">
      How sensitive should aspect ratio detection be?
    </div>
    <div class="description">
      Sensitive preset will allow the extension to correct aspect ratio even when letterbox isn't clearly defined. This
      can result in aspect ratio detection correcting aspect ratio when it shouldn't.
      Accurate preset will take a more conservative approach to determining aspect ratio, correcting aspect ratio only when
      it's absolutely sure that the aspect ratio needs changing. This option results in fewer incorrect aspect ratio corrections,
      but can also result in extension not correcting aspect ratio when it should.
      Strict preset is 'accurate' on steroids.
    </div>

    <div class="flex flex-row row-padding">
      <Button label="Sensitive"
              :selected="sensitivity === 'sensitive'"
              @click.native="setConfirmationThresholds('sensitive')"
      />
      <Button label="Balanced"
              :selected="sensitivity === 'balanced'"
              @click.native="setConfirmationThresholds('balanced')"
      />
      <Button label="Accurate"
              :selected="getSensitivity() === 'accurate'"
              @click.native="setConfirmationThresholds('accurate')"
      />
      <Button label="Strict"
              :selected="getSensitivity() === 'strict'"
              @click.native="setConfirmationThresholds('strict')"
      />
      <Button label="Custom (changed below)"
              :selected="getSensitivity() === 'user-defined'"
      />
    </div>

    <h2 style="padding-top: 150px">Autodetection settings in detail</h2>
    <!-- <div>
      <input type="checkbox"
             v-model="showAdvancedOptions"
      />
      Show advanced options
    </div> -->

    <div class="label">Autodetection frequency</div>
    <div class="description">
      Determines how often we check for aspect ratio changes.
      More frequent aspect ratio checks can result in insane RAM usage.
      Less frequent aspect ratio checks result in bigger delay between aspect ratio change and correction.
      Delays are given in milliseconds.
    </div>

    <div class="info">Note that tick rate must be smaller than check frequency.
      <!-- <a v-if="!showAdvancedOptions"
         href="#"
         @click="showAdvancedOptions = true"
      >Show advanced options</a> -->
    </div>

    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Frequency while playing:
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.timers.playing"
                />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Frequency while paused:
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.timers.paused"
                />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Error timeout:
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.timers.error"
                />
        </div>
      </div>
    </div>

    <div class="indent">
      <div class="flex flex-row row-padding"  v-if="showAdvancedOptions">
        <div class="flex label-secondary form-label">
          Tick rate:
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.timers.tickrate"
                />
        </div>
      </div>
    </div>



    <div class="label">Fallback mode</div>
    <div class="description">
      Some streaming sites implement stuff (DRM) that prevents us from detecting aspect ratio using our favourite way.
      Fortunately for us, some browsers (most notably: Firefox) allow us to work around that limitation using an alternative.
      Said alternative is not without downsides, though:<br />
      <ul><li> it's less accurate and leaves a thin black edge all around the video</li>
      <li> Uses bigger image sample, which translates into slightly to moderately increased RAM and CPU usage <small>(increase in resource usage depends on your monitor resolution)</small></li>
      </ul>
      This is why fallback mode can be toggled off separately from the main thing.
      <span v-if="!fallbackModeAvailable">Unfortunately for you, <b>this option doesn't seem to be available in the browser you're using.</b></span>
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary">

        </div>
        <div class="flex flex-input">
          <input type="checkbox"
                 v-model="settings.active.arDetect.fallbackMode.enabled"
          /> Enable fallback mode&nbsp;<span v-if="!fallbackModeAvailable">because I'm super duper sure I'm using firefox right now.</span>
        </div>
      </div>

      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Safety border thickness (in px)
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.fallbackMode.safetyBorderPx"
                />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Don't react if detected edge is less than this many pixels thick:
        </div>
        <div class="flex flex-input">
          <input type="text"
                v-model="settings.active.arDetect.fallbackMode.noTriggerZonePx"
                />
        </div>
      </div>
    </div>

    <div class="label">Letterbox misallignment threshold</div>
    <div class="description">
      If top and bottom bar differ by more than this (0 — 0%, 1 — 100%), we do not correct aspect ratio.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Letterbox misalignment threshold
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.pillarTest.allowMisaligned"
          />
        </div>
      </div>
    </div>

    <div class="label">Sampling options</div>
    <div class="description">
      Various sampling related options.<br/>
      <b>Static columns:</b> Image is sampled in this many columns, spaced at regular intervals between both edges.<br/>
      <b>Random columns:</b> (ADVANCED; NOT IMPLEMENTED/PLANNED) In addition to static colums, sample image at this many random columns.<br/>
      <b>Static rows:</b> (ADVANCED) Image is sampled in this many rows, spaced at regular intervals between both edges.<br/>
      <b>Sample width, height:</b> (ADVANCED) size of the sample. Bigger -> more accurate aspect ratio detection, but uses more resources.<br/>

    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Static sample columns:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.sampling.staticCols"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Random sample columns:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.sampling.randomCols"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Static rows:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.sampling.staticRows"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Sample width:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.canvasDimensions.sampleCanvas.width"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Static rows:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.canvasDimensions.sampleCanvas.height"
          />
        </div>
      </div>
    </div>

    <div class="label">Blackbar</div>
    <div class="description">
      These settings determine what's considered black and what's considered non-black.<br/>
      <b>Black level:</b> 0-255, where 0 is black. Anything below this number across all RGB components is considered black.
      Black level can decrease if we detect darker blacks in the video. Lower values —> more accurate edge detection;
      higher values —> detection is more forgiving to videos with less-than-ideal contrast ratios.<br/>
      <b>Threshold:</b> If pixel is darker than the sum of black level and this value, it's considered black. In theory, lower -> better.
      In practice, this value needs to be kept surprisingly high (8 might not be high enough), otherwise compression artifacts in videos
      start having an adverse effect on quality of automatic detection.<br/>
      <b>Gradient detection:</b> Attempt to discriminate between hard edges and gradients. 'Strict' and 'Lax' prevent aspect ratio
      changes if we detected gradients instead of a legit edge. This results in fewer false positives, but may cause aspect ratio
      detection to not work on darker frames.<br/>
      <b>Image threshold:</b> When gradient detection is enabled, everything that's brighter than the sum of black level, threshold and
      ths is considered to be non-black.<br/>
      <b>Gradient threshold:</b> If the distance between last black pixel and the first non-black pixel in a given column is more than this value,
      we're looking at a gradient. If this happens while gradient detection is on, we don't change aspect ratio.<br/>
      <b>Gradient sample size:</b> This option is really only relevant when using 'lax' gradient detection. If we don't find a non-black pixel
      within this distance after last known black pixel when scanning a column, we presume we're not on a gradient.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Black level:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.blackbar.blackLevel"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Threshold:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.blackbar.threshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Gradient detection:
        </div>
        <div class="flex flex-input">
          <select v-model="settings.active.arDetect.blackbar.antiGradientMode">
            <option :value="0">Disabled</option>
            <option :value="1">Lax</option>
            <option :value="2">Strict</option>
          </select>
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Image threshold
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.blackbar.imageThreshold"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Gradient threshold:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.blackbar.gradientThreshold"
          />
        </div>
      </div>
      <div v-if="showAdvancedOptions" class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Gradient sample size:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.blackbar.gradientSampleSize"
          />
        </div>
      </div>
    </div>

    <div v-if="showAdvancedOptions">
      <div class="label">Black frame detection</div>
      <div class="description">
        Black frame detection is a quick test that tries to determine whether we're looking at a black frame. This test prevents
        us from wasting precious time trying to detect aspect ratio on frames that are too dark for reliable aspect ratio detection.<br/>
        <b>Sample width, height:</b> Sample size. Since we're checking <i>every</i> pixel in this sample, dimensions should be kept small.<br/>
        <b>Color variance treshold:</b> In videos (such as movie trailers), any text that appears on the black background is usually of
        a roughly the same color, while dark movie footage is not. This allows us to trigger autodetection on dark movie footage and
        to not trigger autodetection when movie trailer flashes some text on black background. If color variance is greater than this value,
        blackframe detection will use 'lax' (lower) cummulative threshold to determine whether the frame is black or not. If color variance
        is less than this value, 'strict' (higher) cummulative threshold will be used to determine whether the frame is black or not instead.<br/>
        <b>Cumulative threshold:</b> If we add the maximum of red, green, blue values of every pixel in the sample and they total more than this, the frame is bright enough.
        Comes in 'lax' and 'strict' versions. See 'color variance threshold' description for details about 'lax' and 'strict.'<br/>
        <b>Black pixel threshold:</b> If more than this fraction of pixels from the sample are "black", we consider the frame black. This overrules cumulative threshold.
      </div>
      <div class="indent">
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Blackframe sample width:
          </div>
          <div class="flex flex-input">
            <input type="text"
                  v-model="settings.active.arDetect.canvasDimensions.blackframeCanvas.width"
            />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Blackframe sample height:
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="settings.active.arDetect.canvasDimensions.blackframeCanvas.height"
            />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Color variance treshold:
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="settings.active.arDetect.blackframe.sufficientColorVariance"
            />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Cumulative threshold (lax mode):
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="settings.active.arDetect.blackframe.cumulativeThresholdLax"
            />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Cumulative threshold (strict mode):
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="settings.active.arDetect.blackframe.cumulativeThresholdStrict"
            />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Black pixel threshold:
          </div>
          <div class="flex flex-input">
            <input type=""
                   v-model="settings.active.arDetect.blackframe.blackPixelsCondition"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="label">Edge detection</div>
    <div class="description">
      Options in this section govern edge detection.<br/>
      <b>Sample width</b> — In a bid to detect "false" edges, we take two samples this many pixels wide near the point of our potential edge. One sample must be completely black, the other must contain a set
      amount of non-black pixels.<br/>
      <b>Detection threshold</b> — non-black sample mentioned above needs to contain at least this many non-black pixels.<br/>
      <b>Thickness quorum (per edge)</b> — amount of samples that agree on the thincknes of the blackbar that we need in order to establish aspect ratio. Every edge needs to have at least this many. Values higher than {{~~(settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold / 2)}} (quorum (total)/2) are pointless.<br/>
      <b>Thickness quorum (total)</b> — amount of samples that agree on the thinckess of the blackbar that we need in order to establish aspect ratio in case one of the edges doesn't contain enough samples to achieve quorum.<br/>
      <b>Logo threshold</b> — if edge candidate sits with count greater than this*all_samples, it can't be a logo or a watermark.<br/>
      <b>Ignore middle area</b> — When trying to detect area, ignore area between middle and canvasHeight * {this value} pixels towards the edge.<br/>
      <b>Detect limit</b> — stop search after finding a potential candidate in this many sample columns<br/>
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Sample width:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.edgeDetection.sampleWidth"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Detection threshold (px):
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.edgeDetection.detectionThreshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Thickness quorum (per edge):
        </div>
        <div class="flex flex-input">
          <input
                 v-model="settings.active.arDetect.edgeDetection.confirmationThreshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Thicnkess quorum (total):
        </div>
        <div class="flex flex-input">
          <input
                 v-model="settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding" v-if="showAdvancedOptions">
        <div class="flex label-secondary form-label">
          Logo threshold:
        </div>
        <div class="flex flex-input">
          <input
                 v-model="settings.active.arDetect.edgeDetection.logoThreshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding" v-if="showAdvancedOptions">
        <div class="flex label-secondary form-label">
          Ignore middle area:
        </div>
        <div class="flex flex-input">
          <input
                 v-model="settings.active.arDetect.edgeDetection.middleIgnoredArea"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding" v-if="showAdvancedOptions">
        <div class="flex label-secondary form-label">
          Detect limit:
        </div>
        <div class="flex flex-input">
          <input
                 v-model="settings.active.arDetect.edgeDetection.minColsForSearch"
          />
        </div>
      </div>
    </div>

    <div class="label">Guard line</div>
    <div class="description">
      Quick test to determine whether aspect ratio hasn't changed. Test is performed by taking two samples on each edge of the image —
      one in the last row of the letterbox (blackbar), and one in the first row of the video (image).<br/>
      <b>Ignore edge margin:</b> We don't take blackbar and image samples {width * this} many pixels from left and right edge.<br/>
      <b>Image threshold:</b> If all pixels in blackbar are black and this fraction (0-1) of pixels in image are non-black, we presume that aspect ratio hasn't changed.<br/>
      <b>Edge tolerance (px):</b> I lied. Blackbar test happens this many pixels away from the last row of the letterbox.
    </div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary ">

        </div>
        <div class="flex flex-input">
          <input type="checkbox"
                 v-model="settings.active.arDetect.guardLine.enabled"
          /> Enable guardline
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Ignore edge margin:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.guardLine.ignoreEdgeMargin"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Image threshold:
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.guardLine.imageTestThreshold"
          />
        </div>
      </div>
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">
          Edge tolerance (px):
        </div>
        <div class="flex flex-input">
          <input type="text"
                 v-model="settings.active.arDetect.guardLine.edgeTolerancePx"
          />
        </div>
      </div>
    </div>

    <div v-if="showAdvancedOptions">
      <div class="label">Aspect ratio change threshold</div>
      <div class="description">
        New and old aspect ratio must differ by at least this much (%, 1=100%) before we trigger aspect ratio correction.
      </div>
      <div class="indent">
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">
            Aspect ratio change threshold.
          </div>
          <div class="flex flex-input">
            <input type=""
                  v-model="settings.active.arDetect.allowedMisaligned"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-row button-box sticky-bottom">
      <Button label="Cancel"
              @click.native="cancel()"
      > 
      </Button>
      <Button label="Save settings"
              @click.native="saveManual()"
      >
      </Button>
    </div>
  </div>
</template>

<script>
import Button from '../common/components/Button.vue';
export default {
  components: {
    Button,
  },

  props: ['settings'],
  data() {
    return {
      showAdvancedOptions: true,
      fallbackModeAvailable: false,
      sensitivity: 'sensitive',
    }
  },
  created() {
    this.sensitivity = this.getSensitivity();

    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawWindow(window,0, 0, 10, 10, "rgba(0,0,0,0)");
      this.fallbackModeAvailable = true;
    } catch (e) {
      this.fallbackModeAvailable = false;
    }
  },
  methods: {
    setArCheckFrequency(event) {
      this.settings.active.arDetect.timers.playing = Math.floor(Math.pow(Math.E, event));
    },
    getSensitivity() {
      if (this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold === 3 && this.settings.active.arDetect.edgeDetection.confirmationThreshold === 1) {
        return 'sensitive';
      }
      if (this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold === 5 && this.settings.active.arDetect.edgeDetection.confirmationThreshold === 2) {
        return 'balanced';
      }
      if (this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold === 7 && this.settings.active.arDetect.edgeDetection.confirmationThreshold === 3) {
        return 'accurate';
      }
      if (this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold === 16 && this.settings.active.arDetect.edgeDetection.confirmationThreshold === 8) {
        return 'strict';
      }
      return 'user-defined';
    },
    setConfirmationThresholds(sens) {
      if (sens === 'sensitive') {
        this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold = 3;
        this.settings.active.arDetect.edgeDetection.confirmationThreshold = 1;
      } else if (sens === 'balanced') {
        this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold = 5;
        this.settings.active.arDetect.edgeDetection.confirmationThreshold = 2;
      } else if (sens === 'accurate') {
        this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold = 7;
        this.settings.active.arDetect.edgeDetection.confirmationThreshold = 3;
      } else if (sens === 'strict') {
        this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold = 16;
        this.settings.active.arDetect.edgeDetection.confirmationThreshold = 8;
      }

      this.sensitivity = this.getSensitivity();
    },
    saveManual(){
      this.settings.save();
      // this.parsedSettings = JSON.stringify(this.settings.active, null, 2);
      // this.lastSettings = JSON.parse(JSON.stringify(this.settings.active));
      const ths = this;
      this.$nextTick( () => {
        ths.parsedSettings = JSON.stringify(ths.lastSettings, null, 2)
        ths.lastSettings = JSON.parse(JSON.stringify(ths.settings.active))
      });
    },
    cancel(){
      this.parsedSettings = '';
      this.settings.rollback();
      const ths = this;
      this.$nextTick( () => ths.parsedSettings = JSON.stringify(ths.lastSettings, null, 2) );
    }
  }
}
</script>

<style lang="scss" scoped>
.form-label {
  width: 20rem;
  text-align: right;
  vertical-align: baseline;
}
</style>
