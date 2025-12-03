<template>
  <div class="flex flex-col relative w-full">
    <h2 class="text-[1.75em]">Keyboard shortcuts</h2>
    <p class="text-stone-500 text-[0.8em]">You can edit keyboard shortcuts here. If the aspect ratio you're looking for doesn't appear on the list, you can add it.</p>

    <div class="flex flex-row gap-2 w-full justify-end mt-4">
      <button @click="clearShortcuts()"><mdicon name="close" :size="16"></mdicon>Clear all shortcuts</button>
      <button @click="resetToDefault()"><mdicon name="restore" :size="16"></mdicon>Reset to default</button>
    </div>

    <div class="flex flex-col w-full">
      <div class="keyboard-shortcut-row bg-stone-900 mt-4 pt-2 pb-1 border-b-1 border-b-stone-700">
        <div class="w-[12em] text-center border-r-1 border-r-stone-700">Command</div>
        <div class="w-[12em] text-center">Keystroke</div>
      </div>

      <!-- CROP -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('crop')"
        >
          <mdicon
            v-if="!groupVisible.crop"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible.crop"
            name="chevron-down"
            :size="16"
          />
          <div>Crop<br/>
            <p class="text-[0.8em] text-stone-500">Safe crop options. Prefers to leave empty space instead of cutting off video edges.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible.crop">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop"
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
        ></KeyboardShortcutEntry>
        <div
          v-if="state !== 'add-crop'"
          class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer"
          @click="startAdding('crop')"
        >
          <mdicon name="plus" :size="16"></mdicon><div>Add new ratio</div>
        </div>
        <template v-else>
          <NewAspectRatioForm
            type="crop"
            :settings="settings"
            @cancel="state = null"
            @add="addAction('crop', $event)"
          ></NewAspectRatioForm>
        </template>
      </template>

      <!-- ZOOM -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('zoom')"
        >
          <mdicon
            v-if="!groupVisible.zoom"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible.zoom"
            name="chevron-down"
            :size="16"
          />
          <div>Zoom<br/>
            <p class="text-[0.8em] text-stone-500">Controls zoom. Will cut off parts of video in order to achieve desired zoom.</p>
          </div>
        </div>
      </div>
      <template v-if="groupVisible.zoom">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.zoom"
          :key="command"
          type="zoom"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
        ></KeyboardShortcutEntry>
        <div class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer">
          <mdicon name="plus" :size="16"></mdicon><div>Add new</div>
        </div>
      </template>

      <!-- STRETCH -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('stretch')"
        >
          <mdicon
            v-if="!groupVisible.stretch"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible.stretch"
            name="chevron-down"
            :size="16"
          />
          <div>Stretch<br/>
            <p class="text-[0.8em] text-stone-500">Control stretching.</p>
          </div>
        </div>
      </div>
      <template v-if="groupVisible.stretch">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.stretch"
          :key="command"
          type="stretch"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === StretchType.FixedSource"
        ></KeyboardShortcutEntry>
        <div class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer">
          <mdicon name="plus" :size="16"></mdicon><div>Add new</div>
        </div>
      </template>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import KeyboardShortcutEntry from './Components/KeyboardShortcutEntry.vue';
import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import StretchType from '@src/common/enums/StretchType.enum';
import NewAspectRatioForm from './Components/NewAspectRatioForm.vue';

import BrowserDetect from '@src/ext/conf/BrowserDetect';
import CropOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/CropOptionsPanel.vue'
import StretchOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/StretchOptionsPanel.vue'
import ZoomOptionsPanel from '@csui/src/PlayerUiPanels/PanelComponents/VideoSettings/ZoomOptionsPanel.vue'

export default defineComponent({
  components: {
    KeyboardShortcutEntry,
    NewAspectRatioForm,

    CropOptionsPanel,
    StretchOptionsPanel,
    ZoomOptionsPanel,
  },
  data() {
    return {
      AspectRatioType: AspectRatioType,
      StretchType: StretchType,
      groupVisible: {
        crop: true,
        stretch: true,
        zoom: true,
      },
      state: null,
    }
  },
  mixins: [
  ],
  props: [
    'settings',      // required for buttons and actions, which are global
  ],
  mounted() {
    this.ghettoComputed = {
      minEnabledWidth: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledWidth * 100, 0),
      minEnabledHeight: this.optionalToFixed(this.settings.active.ui.inPlayer.minEnabledHeight * 100, 0),
    }
  },
  methods: {
    toggleGroupState(groupName: string) {
      this.groupVisible[groupName] = !this.groupVisible[groupName];
    },
    forcePositiveNumber(value) {
      //       Change EU format to US if needed
      //                  |       remove everything after second period if necessary
      //                  |               |            |   remove non-numeric characters
      //                  |               |            |           |
      return value.replaceAll(',', '.').split('.', 2).join('.').replace(/[^0-9.]/g, '');
    },
    optionalToFixed(v, n) {
      if ((`${v}`.split('.')[1]?.length ?? 0) > n) {
        return v.toFixed(n);
      }
      return v;
    },
    addAction(segment: 'stretch' | 'crop' | 'zoom', newCommand) {
      const actionMap = {
        stretch: 'set-stretch',
        crop: 'set-ar',
        zoom: 'set-ar-zoom',
      };
      const typeMap = {
        stretch: StretchType.FixedSource,
        crop: AspectRatioType.Fixed,
        zoom:   AspectRatioType.Fixed,
      };

      const command = {
        action: actionMap[segment],
        label: newCommand.label,
        arguments: {
          type: typeMap[segment],
          ratio: newCommand.ratio
        },
        shortcut: newCommand.shortcut,
      };

      this.settings.active.commands[segment].push(command);
      this.settings.saveWithoutReload();
      this.state = null;
    },
    clearShortcuts() {
      for (const commandList of ['stretch', 'crop', 'zoom']) {
        for (const command of this.settings.active.commands[commandList]) {
          command.shortcut = undefined;
        }
      }
      this.settings.saveWithoutReload();
    },
    resetToDefault() {
      this.settings.active.commands = JSON.parse(JSON.stringify(this.settings.default.commands));
      this.settings.save();
    },
    startAdding(type: string) {
      this.state = `add-${type}`;
    },

  }
});
</script>
<style lang="postcss" scoped>
@import './Components/KeyboardShortcutEntry.css';
</style>
