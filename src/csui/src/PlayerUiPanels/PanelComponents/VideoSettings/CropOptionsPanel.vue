<template>
  <div class="sub-panel-content flex flex-row flex-wrap">

    <ShortcutButton
      v-for="(command, index) of settings?.active.commands.crop"
      class="flex button"
      :class="{
        active: editMode ? index === editModeOptions?.crop?.selectedIndex : isActiveCrop(command),
        'b3-compact': compact,
        b3: !compact
      }"
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
            <input v-model="editModeOptions.crop.selected.label">
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
            :shortcut="editModeOptions?.crop?.selected?.shortcut"
            @shortcutChanged="updateSelectedShortcut($event, 'crop')"
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

  <div v-if="siteSettings && allowSettingSiteDefault" class="edit-action-area">
    <div class="field">
      <div class="label">Default for this site</div>
      <div class="select">
        <select
          :value="siteDefaultCrop"
          @change="setDefaultCrop($event, 'site')"
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
      AspectRatioType: AspectRatioType,

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
    'isEditing',
    'allowSettingSiteDefault',
    'compact',
  ],
  computed: {
    siteDefaultCrop()  {
      if (!this.siteSettings) {
        return null;
      }
      return JSON.stringify(
        this.siteSettings.data.defaults.crop
      );
    },
  },
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
    /**
     * Sets default crop, for either site or global
     */
    setDefaultCrop($event, scope) {
      if (!this.siteSettings) {
        return;
      }
      const commandArguments = JSON.parse($event.target.value);

      this.siteSettings.set('defaults.crop', commandArguments);
      this.settings.saveWithoutReload();
    },

    /**
     * Determines whether a given crop command is the currently active one
     */
    isActiveCrop(cropCommand) {
      if (! this.resizerConfig.crop || !this.siteSettings) {
        return false;
      }

      const defaultCrop = this.siteSettings.data.defaults.crop;

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
  }
}
</script>

<style lang="scss" src="../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped></style>
