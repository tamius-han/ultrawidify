<template>
  <div class="flex flex-col">

    <div class="sub-panel-content flex flex-row flex-wrap">

      <ShortcutButton
        v-for="(command, index) of settings?.active.commands.zoom"
        class="flex b3 button"
        :class="{active: editMode ? index === editModeOptions?.zoom?.selectedIndex : isActiveZoom(command)}"
        :key="index"
        :label="command.label"
        :shortcut="getKeyboardShortcutLabel(command)"
        @click="editMode ? editAction(command, index, 'zoom') : execAction(command)"
      >
      </ShortcutButton>

      <!-- "Add new" button -->
      <ShortcutButton
        v-if="editMode"
        class="button b3"
        :class="{active: editMode ? editModeOptions?.crop?.selectedIndex === null : isActiveCrop(command)}"
        label="Add new"
        @click="editAction(
          {action: 'set-ar-zoom', label: 'New aspect ratio', arguments: {type: AspectRatioType.Fixed}},
          null,
          'zoom'
        )"
      ></ShortcutButton>
    </div>

    <template v-if="isEditing">
      <div v-if="editMode && editModeOptions?.zoom?.selected" class="sub-panel-content">
        <div class="edit-action-area-header">
          <span class="text-primary">Editing options for:</span> <b>{{editModeOptions?.zoom?.selected?.label}}</b>&nbsp;
          <template v-if="editModeOptions?.zoom?.selectedIndex === null && editModeOptions?.zoom?.selected?.label !== 'New aspect ratio'">(New ratio)</template>
        </div>
        <div class="edit-action-area">
          <!-- Some options are only shown for type 4 (fixed) zooms -->
          <template v-if="editModeOptions?.zoom?.selected?.arguments?.type === AspectRatioType.Fixed">
            <div class="field">
              <div class="label">
                Ratio:
              </div>
              <div class="input">
                <!-- We do an ugly in order to avoid spamming functions down at the bottom -->
                <input
                  v-model="editModeOptions.zoom.selected.arguments.ratio"
                  @blur="editModeOptions.zoom.selected.label === 'New aspect ratio' ? editModeOptions.zoom.selected.label = editModeOptions.zoom.selected.arguments.ratio : null"
                >
              </div>
            </div>
            <div class="hint">
              You can enter a ratio in width:height format (e.g. "21:9" or "1:2.39"), or just the factor
              (in this case, "1:2.39" would become "2.39" and "21:9" would become "2.33"). You should enter
              your numbers without quote marks. Number will be converted to factor form on save.
            </div>

            <div class="field">
              <div class="label">
                Label:
              </div>
              <div class="input">
                <input v-model="editModeOptions.zoom.selected.label">
              </div>
            </div>
            <div class="hint">
              Label for the button. You can make it say something other than ratio.
            </div>
          </template>

          <!-- editing keyboard shortcuts is always allowed -->
          <div class="field">
            <div class="label">Shortcut:</div>
            <div class="">
              <EditShortcutButton
                :shortcut="editModeOptions?.zoom?.selected?.shortcut"
                @shortcutChanged="updateSelectedShortcut($event, 'zoom')"
              >
              </EditShortcutButton>
            </div>
          </div>
          <div class="hint">
            <b>Note:</b> Your browser and OS already use certain key combinations that involve Ctrl and Meta (Windows) keys — and, to a lesser extent, Alt.
            The extension doesn't (and cannot) check whether the keyboard shortcut you enter is actually free for you to use. The extension also won't override
            any keyboard shortcuts defined by the site itself.
          </div>

          <div class="flex flex-row flex-end">
            <div
              v-if="editModeOptions?.zoom?.selected?.arguments?.type === AspectRatioType.Fixed && editModeOptions?.zoom?.selectedIndex !== null"
              class="button"
              @click="deleteAction('zoom')"
            >
              <mdicon name="delete"></mdicon> Delete
            </div>
            <div class="flex-grow"></div>
            <div class="button" @click="cancelEdit('zoom')">Cancel</div>
            <div class="button" @click="saveShortcut('zoom')">
              <mdicon name="floppy"></mdicon>
              &nbsp;
              <template v-if="editModeOptions?.zoom?.selectedIndex === null">Add</template>
              <template v-else>Save</template>
            </div>
          </div>

        </div>
      </div>

      <!-- <div v-if="siteSettings && allowSettingSiteDefault" class="edit-action-area">
        <div class="field">
          <div class="label">Default for this site</div>
          <div class="select">
            <select
              :value="siteDefaultZoom"
              @change="setDefaultZoom($event, 'site')"
            >
              <option
                v-for="(command, index) of settings?.active.commands.zoom"
                :key="index"
                :value="JSON.stringify(command.arguments)"
              >
                {{command.label}}
              </option>
            </select>
          </div>
        </div>
      </div> -->
    </template>
    <template v-else>
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
    </template>
  </div>
</template>

<script>
import ShortcutButton from '@csui/src/components/ShortcutButton.vue';
import EditShortcutButton from '@csui/src/components/EditShortcutButton';
import EditModeMixin from '@csui/src/utils/EditModeMixin';
import KeyboardShortcutParserMixin from '@csui/src/utils/KeyboardShortcutParserMixin';
import CommsMixin from '@csui/src/utils/CommsMixin';
import AspectRatioType from '@src/common/enums/AspectRatioType.enum';

export default {
  components: {
    ShortcutButton,
    EditShortcutButton,
  },
  mixins: [
    // ComputeActionsMixin,
    EditModeMixin,
    KeyboardShortcutParserMixin,
    CommsMixin
  ],
  data() {
    return {
      AspectRatioType,

      zoomAspectRatioLocked: true,
      zoom: {
        x: 0,
        y: 0
      },

      // TODO: this should be mixin?
      resizerConfig: {
        crop: null,
        stretch: null,
        zoom: null,
        pan: null
      }
    }
  },
  props: [
    'settings',      // required for buttons and actions, which are global
    'siteSettings',
    'eventBus',
    'isEditing'
  ],
  created() {
    if (this.isEditing) {
      this.enableEditMode();
    }
  },
  watch: {
    isEditing(newValue, oldValue) {
      if (newValue) {
        this.enableEditMode();
      } else {
        this.disableEditMode();
      }
    }
  },
  methods: {
    getZoomForDisplay(axis) {
      // zoom is internally handled logarithmically, because we want to have x0.5, x1, x2, x4 ... magnifications
      // spaced out at regular intervals. When displaying, we need to convert that to non-logarithmic values.

      return `${(Math.pow(2, this.zoom[axis]) * 100).toFixed()}%`
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
    isActiveZoom(command) {
      return false;
    }
  }
}

</script>

<style lang="scss" src="../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped></style>
