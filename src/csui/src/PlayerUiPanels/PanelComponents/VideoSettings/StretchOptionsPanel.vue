<template>
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
</template>

<script>
import ShortcutButton from '../../../../../common/components/ShortcutButton.vue';
import EditShortcutButton from '../../../../../common/components/EditShortcutButton';
import EditModeMixin from '../../../utils/EditModeMixin';
import KeyboardShortcutParserMixin from '../../../utils/KeyboardShortcutParserMixin';
import CommsMixin from '../../../utils/CommsMixin';
import StretchType from '../../../../../common/enums/StretchType.enum';

export default {
  data() {
    return {
      exec: null,
      StretchType: StretchType,

      // TODO: this should be mixin?
      resizerConfig: {
        crop: null,
        stretch: null,
        zoom: null,
        pan: null
      }
    }
  },
  mixins: [
    // ComputeActionsMixin,
    EditModeMixin,
    KeyboardShortcutParserMixin,
    CommsMixin
  ],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site',
    'isEditing'
  ],
  components: {
    ShortcutButton,
    EditShortcutButton,
  },
  computed: {
    extensionDefaultStretch() {
      return JSON.stringify(
        this.settings?.active.stretch?.default ?? {type: StretchMode.NoStretch}
      );
    },
    siteDefaultStretch() {
      return JSON.stringify(
        this.settings?.getDefaultStretch(this.site) ?? {type: StretchMode.NoStretch}
      );
    },
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
     * Sets default stretching mode, for either site or global
     */
    setDefaultStretchingMode($event, globalOrSite) {
      const commandArguments = JSON.parse($event.target.value);
      this.siteSettings.set('defaults.stretch', commandArguments);
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
  }
}
</script>

<style lang="scss" src="../../../../../res/css/flex.scss" scoped></style>
<style lang="scss" src="../../../res-common/panels.scss" scoped></style>
<style lang="scss" src="../../../res-common/common.scss" scoped></style>
