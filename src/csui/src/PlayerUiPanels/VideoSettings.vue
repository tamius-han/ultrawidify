<template>
  <div class="flex flex-column">
    <!-- 'Change UI' options is a tiny bit in upper right corner. -->
    <div
      class="options-bar flex flex-row"
      :class="{isEditing: editMode}"
    >
      <template v-if="editMode">
        <div class="flex-grow">
          You are currently editing options and shortcuts.
        </div>
        <div
          class="flex-nogrow flex-noshrink"
          @click="disableEditMode()"
        >
          Exit edit mode
        </div>
      </template>
      <template v-else>
        <div class="flex-grow"></div>
        <div
          class=""
          @click="enableEditMode()"
        >
          Edit ratios and shortcuts
        </div>
      </template>
    </div>

    <!-- The rest of the tab is under 'edit ratios and shortcuts' row -->
    <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">

      <!-- CROP OPTIONS -->
      <div v-if="settings" class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="crop" :size="32" />
          <h1>Crop video:</h1>
        </div>
        <div class="sub-panel-content flex flex-row flex-wrap">
          <ShortcutButton
            v-for="(command, index) of settings?.active.commands.crop"
            class="flex b3 button"
            :class="{active: editMode ? index === editModeOptions?.crop?.selectedIndex : isActiveCrop(command)}"
            :key="index"
            :label="command.label"
            :shortcut="getKeyboardShortcutLabel(command)"
            @click="editMode ? editAction(command, index, 'crop') : execAction(command)"
          >
          </ShortcutButton>

          <!-- "Add new" button -->
          <ShortcutButton
            v-if="editMode"
            class="button b3"
            :class="{active: editMode ? editModeOptions?.crop?.selectedIndex === null : isActiveCrop(command)}"
            label="Add new"
            @click="editAction(
              {action: 'set-ar', label: 'New aspect ratio', arguments: {type: AspectRatioType.Fixed}},
              null,
              'crop'
            )"
          ></ShortcutButton>
        </div>

        <!-- EDIT MODE PANEL -->
        <div
          v-if="editMode && !editModeOptions?.crop?.selected"
          class="sub-panel-content"
        >
          <div class="edit-action-area">
            Click a button to edit
          </div>
        </div>
        <div v-if="editMode && editModeOptions?.crop?.selected" class="sub-panel-content">
          <div class="edit-action-area-header">
            <span class="text-primary">Editing options for:</span> <b>{{editModeOptions?.crop?.selected?.label}}</b>&nbsp;
            <template v-if="editModeOptions?.crop?.selectedIndex === null && editModeOptions?.crop?.selected?.label !== 'New aspect ratio'">(New ratio)</template>
          </div>
          <div class="edit-action-area">
            <!-- Some options are only shown for type 4 (fixed) crops -->
            <template v-if="editModeOptions?.crop?.selected?.arguments?.type === AspectRatioType.Fixed">
              <div class="field">
                <div class="label">
                  Ratio:
                </div>
                <div class="input">
                  <!-- We do an ugly in order to avoid spamming functions down at the bottom -->
                  <input
                    v-model="editModeOptions.crop.selected.arguments.ratio"
                    @blur="editModeOptions.crop.selected.label === 'New aspect ratio' ? editModeOptions.crop.selected.label = editModeOptions.crop.selected.arguments.ratio : null"
                  >
                </div>
                <div class="hint">
                  You can enter a ratio in width:height format (e.g. "21:9" or "1:2.39"), or just the factor
                  (in this case, "1:2.39" would become "2.39" and "21:9" would become "2.33"). You should enter
                  your numbers without quote marks. Number will be converted to factor form on save.
                </div>
              </div>
              <div class="field">
                <div class="label">
                  Label:
                </div>
                <div class="input">
                  <input v-model="editModeOptions.crop.selected.label">
                </div>
                <div class="hint">
                  Label for the button. You can make it say something other than ratio.
                </div>
              </div>
            </template>

            <!-- editing keyboard shortcuts is always allowed -->
            <div class="field">
              <div class="label">Shortcut:</div>
              <div class="">
                <EditShortcutButton
                  :shortcut="editModeOptions?.crop?.selected?.shortcut"
                  @shortcutChanged="updateSelectedShortcut($event, 'crop')"
                >
                </EditShortcutButton>
              </div>
              <div class="hint">
                <b>Note:</b> Your browser and OS already use certain key combinations that involve Ctrl and Meta (Windows) keys — and, to a lesser extent, Alt.
                The extension doesn't (and cannot) check whether the keyboard shortcut you enter is actually free for you to use. The extension also won't override
                any keyboard shortcuts defined by the site itself.
              </div>
            </div>

            <div class="flex flex-row flex-end">
              <div
                v-if="editModeOptions?.crop?.selected?.arguments?.type === AspectRatioType.Fixed && editModeOptions?.crop?.selectedIndex !== null"
                class="button"
                @click="deleteAction('crop')"
              >
                <mdicon name="delete"></mdicon> Delete
              </div>
              <div class="flex-grow"></div>
              <div class="button" @click="cancelEdit('crop')">Cancel</div>
              <div class="button" @click="saveShortcut('crop')">
                <mdicon name="floppy"></mdicon>
                &nbsp;
                <template v-if="editModeOptions?.crop?.selectedIndex === null">Add</template>
                <template v-else>Save</template>
              </div>
            </div>

          </div>
        </div>

        <div class="edit-action-area">
          <div class="field">
            <div class="label">Default for this site</div>
            <div class="select">
              <select
                :value="siteDefaultCrop"
                @click="setDefaultCrop($event, 'site')"
              >
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
          <div class="field">
            <div class="label">Extension default</div>
            <div class="select">
              <select
                :value="extensionDefaultCrop"
                @click="setDefaultCrop($event, 'global')"
              >
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
        </div>
      </div>

      <!-- STRETCH OPTIONS -->
      <div v-if="settings" class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="stretch-to-page-outline" :size="32" />
          <h1>Stretch video:</h1>
        </div>
        <div class="flex flex-row flex-wrap">
          <ShortcutButton
            v-for="(command, index) of settings?.active.commands.stretch"
            class="b3 button"
            :class="{active: editMode ? index === editModeOptions?.stretch?.selectedIndex : isActiveStretch(command)}"
            :key="index"
            :label="command.label"
            :shortcut="getKeyboardShortcutLabel(command)"
            @click="editMode ? editAction(command, index, 'stretch') : execAction(command)"
          >
          </ShortcutButton>

          <!-- "Add new" button -->
          <ShortcutButton
            v-if="editMode"
            class="button b3"
            label="Add new"
            @click="editAction(
              {action: 'set-stretch', label: 'Stretch to ...', arguments: {type: StretchType.FixedSource}},
              null,
              'stretch'
            )"
          ></ShortcutButton>
        </div>

        <!-- EDIT MODE PANEL -->
        <div
          v-if="editMode && !editModeOptions?.stretch?.selected"
          class="sub-panel-content"
        >
          <div class="edit-action-area">
            Click a button to edit
          </div>
        </div>
        <div v-if="editMode && editModeOptions?.stretch?.selected" class="sub-panel-content">
          <div class="edit-action-area-header">
            <span class="text-primary">Editing options for:</span> <b>{{editModeOptions?.stretch?.selected?.label}}</b>&nbsp;
            <template v-if="editModeOptions?.stretch?.selectedIndex === null && editModeOptions?.stretch?.selected?.label !== 'Stretch to ...'">(New option)</template>
          </div>
          <div class="edit-action-area">
            <!-- There are some special options for 'thin borders' -->
            <template v-if="editModeOptions?.stretch?.selected?.arguments?.type === StretchType.Conditional">
              <div class="field">
                <div class="label">
                  Limit:
                </div>
                <div class="input">
                  <input
                    v-model="editModeOptions.stretch.selected.arguments.limit"
                  >
                </div>
                <div class="hint">
                  If vertical borders would take up less than this much of screen width, the image will be stretched. If the borders are too thick, image will not be stretched.
                  Value of 1 means 100%. Value of 0.1 means vertical black bars can take up 10% of the width at most. There's no validation on this, use common sense.
                </div>
              </div>
            </template>

            <!-- Some options are only shown for type 5 (fixed) stretch -->
            <template v-if="editModeOptions?.stretch?.selected?.arguments?.type === StretchType.FixedSource">
              <div class="field">
                <div class="label">
                  Ratio:
                </div>
                <div class="input">
                  <!-- We do an ugly in order to avoid spamming functions down at the bottom -->
                  <input
                    v-model="editModeOptions.stretch.selected.arguments.ratio"
                    @blur="editModeOptions.stretch.selected.label === 'Stretch to ...' ? editModeOptions.stretch.selected.label = `Stretch to ${editModeOptions.stretch.selected.arguments.ratio}` : null"
                  >
                </div>
                <div class="hint">
                  You can enter a ratio in width:height format (e.g. "21:9" or "1:2.39"), or just the factor
                  (in this case, "1:2.39" would become "2.39" and "21:9" would become "2.33"). You should enter
                  your numbers without quote marks. Number will be converted to factor form on save.
                </div>
              </div>
              <div class="field">
                <div class="label">
                  Label:
                </div>
                <div class="input">
                  <input v-model="editModeOptions.stretch.selected.label">
                </div>
                <div class="hint">
                  Label for the button. You can make it say something other than ratio.
                </div>
              </div>
            </template>

            <!-- editing keyboard shortcuts is always allowed -->
            <div class="field">
              <div class="label">Shortcut:</div>
              <div class="">
                <EditShortcutButton
                  :shortcut="editModeOptions?.stretch?.selected?.shortcut"
                  @shortcutChanged="updateSelectedShortcut($event, 'stretch')"
                >
                </EditShortcutButton>
              </div>
              <div class="hint">
                <b>Note:</b> Your browser and OS already use certain key combinations that involve Ctrl and Meta (Windows) keys — and, to a lesser extent, Alt.
                The extension doesn't (and cannot) check whether the keyboard shortcut you enter is actually free for you to use. The extension also won't override
                any keyboard shortcuts defined by the site itself.
              </div>
            </div>

            <div class="flex flex-row flex-end">
              <div
                v-if="editModeOptions?.stretch?.selected?.arguments?.type === StretchType.FixedSource && editModeOptions?.stretch?.selectedIndex !== null"
                class="button"
                @click="deleteAction('stretch')"
              >
                <mdicon name="delete"></mdicon> Delete
              </div>
              <div class="flex-grow"></div>
              <div class="button" @click="cancelEdit('stretch')">Cancel</div>
              <div class="button" @click="saveShortcut('stretch')">
                <mdicon name="floppy"></mdicon>
                &nbsp;
                <template v-if="editModeOptions?.crop?.selectedIndex === null">Add</template>
                <template v-else>Save</template>
              </div>
            </div>

          </div>
        </div>

        <div class="edit-action-area">
          <div class="field">
            <div class="label">Default for this site:</div>
            <div class="select">
              <div class="select">
                <select
                  v-model="siteDefaultStretchMode"
                  @click="setDefaultStretchingMode($event, 'site')"
                >
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
          </div>

          <div class="field">
            <div class="label">Extension default:</div>
            <div class="select">
              <select
                v-model="extensionDefaultStretchMode"
                @click="setDefaultStretchingMode($event, 'global')"
              >
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
        </div>
      </div>


      <!-- ZOOM OPTIONS -->
      <div class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="magnify-plus-outline" :size="32" />
          <h1>Manual zoom:</h1>
        </div>
        <div class="flex flex-column">
          <!--
            min, max and value need to be implemented in js as this slider
            should use logarithmic scale
          -->
          <div class="flex flex-row flex-end">
            <Button
              v-if="zoomAspectRatioLocked"
              label="Unlock aspect ratio"
              icon="lock-open"
              :fixedWidth="true"
              @click="toggleZoomAr()"
            >
            </Button>
            <Button
              v-else
              label="Lock aspect ratio"
              icon="lock"
              :fixedWidth="true"
              @click="toggleZoomAr()"
            >
            </Button>
          </div>
          <template v-if="zoomAspectRatioLocked">
            <input id="_input_zoom_slider"
                    class="input-slider"
                    type="range"
                    step="any"
                    min="-1"
                    max="3"
                    :value="zoom.x"
                    @input="changeZoom($event.target.value)"
                    />
            <div style="overflow: auto" class="flex flex-row">
              <div class="flex flex-grow medium-small x-pad-1em">
                Zoom: {{getZoomForDisplay('x')}}
              </div>
              <div class="flex flex-nogrow flex-noshrink medium-small">
                <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
              </div>
            </div>
          </template>
          <template v-else>
            <div>Horizontal zoom</div>
            <input id="_input_zoom_slider"
                    class="input-slider"
                    type="range"
                    step="any"
                    min="-1"
                    max="4"
                    :value="zoom.x"
                    @input="changeZoom($event.target.value, 'x')"
            />

            <div>Vertical zoom</div>
            <input id="_input_zoom_slider"
                    class="input-slider"
                    type="range"
                    step="any"
                    min="-1"
                    max="3"
                    :value="zoom.y"
                    @input="changeZoom($event.target.value, 'y')"
            />

            <div style="overflow: auto" class="flex flex-row">
              <div class="flex flex-grow medium-small x-pad-1em">
                Zoom: {{getZoomForDisplay('x')}} x {{getZoomForDisplay('y')}}
              </div>
              <div class="flex flex-nogrow flex-noshrink medium-small">
                <a class="_zoom_reset x-pad-1em" @click="resetZoom()">reset</a>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div class="sub-panel">
        <div class="flex flex-row">
          <mdicon name="align-horizontal-center" :size="32" />
          <h1>Video alignment:</h1>
        </div>

        <div class="flex flex-row">
          <alignment-options-control-component
            :eventBus="eventBus"
          >
          </alignment-options-control-component>
        </div>

        <div class="flex flex-row flex-wrap">
          <div class="m-t-0-33em display-block">
            <input id="_input_zoom_site_allow_pan"
                    type="checkbox"
                    />
            Pan with mouse
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Button from '../../../common/components/Button.vue'
import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../../../common/components/ShortcutButton';
import EditShortcutButton from '../../../common/components/EditShortcutButton';
import ComputeActionsMixin from '../../../common/mixins/ComputeActionsMixin';
import ExecAction from '../ui-libs/ExecAction';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import StretchType from '../../../common/enums/StretchType.enum';
import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import AlignmentOptionsControlComponent from './AlignmentOptionsControlComponent.vue';

export default {
  data() {
    return {
      exec: null,
      scope: 'page',
      CropModePersistence: CropModePersistence,
      StretchType: StretchType,
      AspectRatioType: AspectRatioType,
      zoomAspectRatioLocked: true,
      zoom: {
        x: 0,
        y: 0
      },
      editMode: false,
      editModeOptions: {
      },
      resizerConfig: {
        crop: null,
        stretch: null,
        zoom: null,
        pan: null
      }
    }
  },
  mixins: [
    ComputeActionsMixin,
  ],
  props: [
    'settings',
    'frame',
    'cropModePersistence',
    'eventBus',
    'site'
  ],
  created() {
    this.exec = new ExecAction(this.settings, window.location.hostname);
    // todo: replace event bus with postMessage
    // this.eventBus.subscribe('announce-zoom', {
    //   function: (config) => {
    //     this.zoom = {
    //       x: Math.log2(config.x),
    //       y: Math.log2(config.y)
    //     };
    //   }
    // });
    // this.eventBus.send('get-current-config');
    this.eventBus.subscribe('uw-config-broadcast', {function: (config) => this.handleConfigBroadcast(config)});
  },
  mounted() {
    this.eventBus.sendToTunnel('get-ar');
  },
  components: {
    ShortcutButton,
    EditShortcutButton,
    Button,
    AlignmentOptionsControlComponent
  },
  computed: {
    // because this is passed to a <select>, all the values must be
    // passed as strings.
    extensionDefaultCrop() {
      return JSON.stringify(
        this.settings?.active.crop?.default ?? {type: AspectRatioType.Automatic}
      );
    },
    siteDefaultCrop()  {
      return JSON.stringify(
        this.settings?.getDefaultCrop(this.site) ?? {type: AspectRatioType.Automatic}
      );
    },
    extensionDefaultStretchMode () {
      return JSON.stringify(
        this.settings?.active.stretch.default ?? {type: StretchType.NoStretch}
      );
    },
    siteDefaultStretchMode () {
      return JSON.stringify(
        this.settings?.getDefaultStretchMode(this.site) ?? {type: StretchType.NoStretch}
      );
    }
  },
  methods: {
    getZoomForDisplay(axis) {
      // zoom is internally handled logarithmically, because we want to
      // have x0.5, x1, x2, x4 ... magnifications spaced out at regular
      // intervals. When displaying, we need to conver that back to non-
      // logarithmic units.

      return `${ (Math.pow(2, this.zoom[axis]) * 100).toFixed()}%`;
    },
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },

    toggleZoomAr() {
      this.zoomAspectRatioLocked = !this.zoomAspectRatioLocked;
    },

    resetZoom() {
      // we store zoom logarithmically on this component
      this.zoom = {x: 0, y: 0};

      // we do not use logarithmic zoom elsewhere
      // todo: replace eventBus with postMessage to parent
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'y'});
      // this.eventBus.send('set-zoom', {zoom: 1, axis: 'x'});

      this.eventBus?.sendToTunnel('set-zoom', {zoom: 1, axis: 'y'});
      this.eventBus?.sendToTunnel('set-zoom', {zoom: 1, axis: 'x'});
    },
    changeZoom(newZoom, axis) {
      // we store zoom logarithmically on this compnent
      if (!axis) {
        this.zoom.x = newZoom;
      } else {
        this.zoom[axis] = newZoom;
      }

      // we do not use logarithmic zoom elsewhere, therefore we need to convert
      newZoom = Math.pow(2, newZoom);

      if (this.zoomAspectRatioLocked) {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: 'y'});
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: 'x'});
      } else {
        this.eventBus?.sendToTunnel('set-zoom', {zoom: newZoom, axis: axis ?? 'x'});
      }
    },

    //#region cropping
    /**
     * Sets default crop, for either site or global
     */
    setDefaultCrop($event, scope) {
      const commandArguments = JSON.parse($event.target.value);

      if (scope === 'site') {
        if (!this.settings.active.sites[this.site]) {
          this.settings.active.sites[this.site] = this.settings.getDefaultSiteConfiguration();
        }
        this.settings.active.sites[this.site].defaultCrop = commandArguments;
      } else {
        // eventually, this 'if' will be safe to remove (and we'll be able to only
        // get away with the 'else' section) Maybe in 6 months or so.
        if (!this.settings.active.crop) {
          this.settings.active['crop'] = {
            default: commandArguments
          }
        } else {
          this.settings.active.crop.default = commandArguments;
        }
      }

      this.settings.saveWithoutReload();
    },

    /**
     * Determines whether a given crop command is the currently active one
     */
    isActiveCrop(cropCommand) {
      if (! this.resizerConfig.crop) {
        return false;
      }

      const defaultCrop = this.settings.getDefaultCrop(this.site);

      if (cropCommand.arguments.type === AspectRatioType.Automatic) {
        return this.resizerConfig.crop.type === AspectRatioType.Automatic
          || this.resizerConfig.crop.type === AspectRatioType.AutomaticUpdate
          || this.resizerConfig.crop.type === AspectRatioType.Initial && defaultCrop === AspectRatioType.Automatic;
      }
      if (cropCommand.arguments.type === AspectRatioType.Reset) {
        return this.resizerConfig.crop.type === AspectRatioType.Reset
          || this.resizerConfig.crop.type === AspectRatioType.Initial && defaultCrop !== AspectRatioType.Automatic;
      }
      if (cropCommand.arguments.type === AspectRatioType.Fixed) {
        return this.resizerConfig.crop.type === AspectRatioType.Fixed
          && this.resizerConfig.crop.ratio === cropCommand.arguments.ratio;
      }
      // only legacy options (fitw, fith) left to handle:
      return cropCommand.arguments.type === this.resizerConfig.crop.type;
    },
    //#endregion cropping

    //#region stretch
    /**
     * Sets default stretching mode, for either site or global
     */
    setDefaultStretchingMode($event, globalOrSite) {
      const commandArguments = JSON.parse($event.target.value);

      if (globalOrSite === 'site') {
        if (!this.settings.active.sites[this.site]) {
          this.settings.active.sites[this.site] = this.settings.getDefaultSiteConfiguration();
        }
        this.settings.active.sites[this.site].defaultStretch = commandArguments;
      } else {
          this.settings.active.stretch.default = commandArguments;
      }
      this.settings.saveWithoutReload();
    },

    /**
     * Determines whether a given stretch command is the currently active one
     */
    isActiveStretch(stretchCommand) {
      if (! this.resizerConfig.stretch) {
        return false;
      }

      // const defaultCrop = this.settings.getDefaultStretch(this.site);

      if ([StretchType.NoStretch, StretchType.Basic, StretchType.Hybrid, StretchType.Conditional, StretchType.Default].includes(stretchCommand.arguments.type)) {
        return this.resizerConfig.stretch.type === stretchCommand.arguments.type;
      }
      return this.resizerConfig.crop.type === stretchCommand.arguments.type && this.resizerConfig.crop.ratio === stretchCommand.arguments.ratio;
    },
    //#endregion cropping

    //#region edit mode
    enableEditMode() {
      this.editMode = true;
      this.editModeOptions = {};
    },

    disableEditMode() {
      this.editMode = false;
    },

    editAction(command, index, actionType) {
      try {
        if (!this.editModeOptions[actionType]) {
          this.editModeOptions[actionType] = {selected: command, selectedIndex: index}
        } else {
          this.editModeOptions[actionType].selected = command;
          this.editModeOptions[actionType].selectedIndex = index;
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::editAction():`, e);
      }
    },

    updateSelectedShortcut(shortcut, actionType) {
      try {
        if (!this.editModeOptions[actionType]?.selected) {
          return;
        } else {
          this.editModeOptions[actionType].selected.shortcut = shortcut
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::updateShortcut():`, e);
      }
    },

    cancelEdit(actionType) {
      try {
        if (!this.editModeOptions[actionType]) {
          return;
        } else {
          this.editModeOptions[actionType] = undefined;;
        }
      } catch (e) {
        console.error(`[Ultrawidify] there's a problem with VideoSettings.vue::cancelEdit():`, e);
      }
    },

    saveShortcut(actionType) {
      if (!this.editModeOptions[actionType]?.selectedIndex) {
        this.settings.active.commands[actionType].push(this.editModeOptions[actionType].selected);
      }
      this.settings.active.commands[actionType][this.editModeOptions[actionType].selectedIndex] = this.editModeOptions[actionType]?.selected;
      this.settings.saveWithoutReload();

      this.editModeOptions[actionType] = undefined;
    },

    deleteAction(actionType) {
      const selectedIndex = this.editModeOptions[actionType].selectedIndex;

      // prevent deleting first item if 'delete' button shows on 'add new' dialog
      if (selectedIndex === undefined || selectedIndex === null) {
        return;
      }

      this.settings.active.commands[actionType].splice(selectedIndex, 1);
      this.settings.saveWithoutReload();

      this.editModeOptions[actionType] = undefined;
    },

    //#endregion

    //#region comms and bus

    /**
     * Handles 'uw-config-broadcast' messages coming to our
     */
    handleConfigBroadcast(message) {
      if (message.type === 'ar') {
        this.resizerConfig.crop = message.config;
      }

      this.$nextTick( () => this.$forceUpdate() );
    },

    /**
     * Sends commands to main content script in parent iframe
     * @param {*} command
     */
    execAction(command) {
      const cmd = JSON.parse(JSON.stringify(command));
      this.eventBus?.sendToTunnel(cmd.action, cmd.arguments);
    },
    //#endregion

    /**
     * Parses command's keyboard shortcut into human-readable label
     */
    getKeyboardShortcutLabel(command) {
      if (! command.shortcut) {
        return '';
      }
      return KeyboardShortcutParser.parseShortcut(command.shortcut);
    },
  }
}
</script>

<style lang="scss" src="../../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="../res-common/panels.scss" scoped module></style>
<style lang="scss" src="../res-common/common.scss" scoped module></style>

<style lang="scss" scoped module>
@import '../res-common/variables';

.options-bar {
  margin: 1rem;
  padding: 1rem;

  &.isEditing {
    background-color: $primary;
    color: #000;
  }
}
.b3 {
  width: 9rem;
  padding-left: 0.33rem;
  padding-right: 0.33rem;
}
.input-slider {
  width: 480px;
}
.warning-lite {
  padding-right: 16px;
  padding-bottom: 16px;
  padding-top: 8px;
}

.edit-action-area {
  background-color: rgba($blackBg,0.5);
  padding: 0.5rem;
  margin-bottom: 2rem;
}
.edit-action-area-header {
  background-color: $primary;
  color: #000;
  padding: 0.25rem 0.5rem;
  padding-top: 0.5rem;
}
</style>
