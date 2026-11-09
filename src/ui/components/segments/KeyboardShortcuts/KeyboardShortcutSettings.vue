<template>
  <div class="flex flex-col relative w-full">
    <h2 class="text-[1.75em]">Mouse controls</h2>
    <div>
      <div class="field">
        <div class="label">
          Pan video on mouse move, while holding:
        </div>
        <div class="flex flex-input select">
          <select v-model="optionCache.mousePan" @change="updatePanOptions()">
            <option value="">Disable</option>
            <option value="shift">Hold Shift</option>
            <option value="ctrl">Hold Ctrl</option>
            <option value="ctrlshift">Hold Ctrl + Shift</option>
          </select>
        </div>
      </div>
      <div class="field">
        <div class="label">
          <input type="checkbox"
            v-model="settings.active.mouseOptions.invertPan"
            @change="saveSettings()"
          >
        </div>
        <div class="text-left">
          Invert pan direction
        </div>
      </div>


      <div class="field">
        <div class="label">
          <input type="checkbox"
            v-model="settings.active.mouseOptions.shiftZoom"
            @change="saveSettings()"
          >
        </div>
        <div class="text-left">
          Enable zooming on <code>Shift</code> + scroll
        </div>
      </div>
      <div class="field">
        <div class="label">
          <input type="checkbox"
            v-model="settings.active.mouseOptions.invertZoom"
            @change="saveSettings()"
          >
        </div>
        <div class="text-left">
          Invert zoom direction
        </div>
      </div>

      <div class="field">
        <div class="label">
          <input type="checkbox"
            v-model="settings.active.ui.inPlayer.activateWithCtrl"
            @change="saveSettings()"
          >
        </div>
        <div class="text-left">
          Show in-player UI on <code>Ctrl</code> + mouse move
        </div>
      </div>
    </div>

    <h2 class="text-[1.75em] mt-8">Keyboard shortcuts</h2>
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

      <!-- Non-fixed crop -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('crop-novariant')"
        >
          <mdicon
            v-if="!groupVisible['crop-novariant']"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible['crop-novariant']"
            name="chevron-down"
            :size="16"
          />
          <div>Special crop options<br/>
            <p class="text-[0.8em] text-stone-500">These options have same effect, regardless of video fit setting.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible['crop-novariant']">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop
            .filter(x => (x?.arguments?.type !== AspectRatioType.Fixed && x?.arguments?.type !== AspectRatioType.Automatic && x?.arguments?.type !== AspectRatioType.Cycle))
          "
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
          @actionRemoved="reload()"
        ></KeyboardShortcutEntry>
        <div
          v-if="state !== 'add-crop-novariant'"
          class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer"
          @click="startAdding('crop-novariant')"
        >
          <mdicon name="plus" :size="16"></mdicon><div>Add new ratio</div>
        </div>
        <template v-else>
          <NewAspectRatioForm
            type="crop"
            :settings="settings"
            @cancel="state = null"
            @add="addAction('crop', $event, { variant: undefined })"
          ></NewAspectRatioForm>
        </template>
      </template>

      <!-- CROP without variant -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('crop-novariant')"
        >
          <mdicon
            v-if="!groupVisible['crop-novariant']"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible['crop-novariant']"
            name="chevron-down"
            :size="16"
          />
          <div>Crop/zoom with currently selected fit mode<br/>
            <p class="text-[0.8em] text-stone-500">Crops or zooms according to the 'fit video' setting.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible['crop-novariant']">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop
            .filter(x => (x?.arguments?.type === AspectRatioType.Fixed || x?.arguments?.type === AspectRatioType.Automatic || x?.arguments?.type === AspectRatioType.Cycle) && x?.arguments?.variant === undefined)
            .sort((b, a) => (a.arguments.ratio ?? Number.POSITIVE_INFINITY) - (b.arguments.ratio ?? Number.POSITIVE_INFINITY))
          "
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
          @actionRemoved="reload()"
        ></KeyboardShortcutEntry>
        <div
          v-if="state !== 'add-crop-novariant'"
          class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer"
          @click="startAdding('crop-novariant')"
        >
          <mdicon name="plus" :size="16"></mdicon><div>Add new ratio</div>
        </div>
        <template v-else>
          <NewAspectRatioForm
            type="crop"
            :settings="settings"
            @cancel="state = null"
            @add="addAction('crop', $event, { variant: undefined })"
          ></NewAspectRatioForm>
        </template>
      </template>


      <!-- CROP (zoom @ fit video -->
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
            <p class="text-[0.8em] text-stone-500">Fits video to the player and only removes double letterboxing. If selected aspect ratio does not fit the player, remaining letterbox will not be removed.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible.crop">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop
            .filter(x => (x?.arguments?.type === AspectRatioType.Fixed || x?.arguments?.type === AspectRatioType.Automatic || x?.arguments?.type === AspectRatioType.Cycle)  && x?.arguments?.variant === ArVariant.FitVideo)
            .sort((b,a) => (a.arguments.ratio ?? Number.POSITIVE_INFINITY) - (b.arguments.ratio ?? Number.POSITIVE_INFINITY))
          "
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
          @actionRemoved="reload()"
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
            @add="addAction('crop', $event, { variant: ArVariant.FitVideo })"
          ></NewAspectRatioForm>
        </template>
      </template>

      <!-- ZOOM (@ fill frame) -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('fill-frame')"
        >
          <mdicon
            v-if="!groupVisible['fill-frame']"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible['fill-frame']"
            name="chevron-down"
            :size="16"
          />
          <div>Zoom (fill frame)<br/>
            <p class="text-[0.8em] text-stone-500">Ensures video player is always filled. If selected aspect ratio does not fit the player, video will be cropped until no black bars remain.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible['fill-frame']">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop
            .filter(x => (x?.arguments?.type === AspectRatioType.Fixed || x?.arguments?.type === AspectRatioType.Automatic || x?.arguments?.type === AspectRatioType.Cycle)  && x?.arguments?.variant === ArVariant.FillFrame)
            .sort((b, a) => (a.arguments.ratio ?? Number.POSITIVE_INFINITY) - (b.arguments.ratio ?? Number.POSITIVE_INFINITY))
          "
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
          @actionRemoved="reload()"
        ></KeyboardShortcutEntry>
        <div
          v-if="state !== 'add-zoom-fill-frame'"
          class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer"
          @click="startAdding('zoom-fill-frame')"
        >
          <mdicon name="plus" :size="16"></mdicon><div>Add new ratio</div>
        </div>
        <template v-else>
          <NewAspectRatioForm
            type="crop"
            :settings="settings"
            @cancel="state = null"
            @add="addAction('crop', $event, { variant: ArVariant.FillFrame })"
          ></NewAspectRatioForm>
        </template>
      </template>

      <!-- ZOOM (unconstrained) -->
      <div
        class="keyboard-shortcut-row"
      >
        <div
          class="w-[32em] flex flex-row gap-2 items-center"
          @click="toggleGroupState('unconstrained')"
        >
          <mdicon
            v-if="!groupVisible.unconstrained"
            name="chevron-right"
            :size="16"
          />
          <mdicon
            v-if="groupVisible.unconstrained"
            name="chevron-down"
            :size="16"
          />
          <div>Zoom (unconstrained)<br/>
            <p class="text-[0.8em] text-stone-500">Applies zoom without constraints.</p>
          </div>
        </div>
      </div>
      <div>
        <!-- Here just to break even/odd -->
      </div>
      <template v-if="groupVisible.unconstrained">
        <KeyboardShortcutEntry
          v-for="command in settings.active.commands.crop
            .filter(x => (x?.arguments?.type === AspectRatioType.Fixed || x?.arguments?.type === AspectRatioType.Automatic || x?.arguments?.type === AspectRatioType.Cycle) && x?.arguments?.variant === ArVariant.None)
            .sort((b, a) => (a.arguments.ratio ?? Number.POSITIVE_INFINITY) - (b.arguments.ratio ?? Number.POSITIVE_INFINITY))
          "
          :key="command"
          type="crop"
          :indent="2"
          :command="command"
          :settings="settings"
          :removable="command?.arguments?.type === AspectRatioType.Fixed"
          @actionRemoved="reload()"
        ></KeyboardShortcutEntry>
        <div
          v-if="state !== 'add-zoom-unconstrained'"
          class="ml-12 w-[16em] flex flex-row text-[0.8rem] gap-2 my-2 font-bold items-center hover:text-white cursor-pointer"
          @click="startAdding('zoom-unconstrained')"
        >
          <mdicon name="plus" :size="16"></mdicon><div>Add new ratio</div>
        </div>
        <template v-else>
          <NewAspectRatioForm
            type="crop"
            :settings="settings"
            @cancel="state = null"
            @add="addAction('crop', $event, { variant: ArVariant.None })"
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
          <div>Zoom (free-form)<br/>
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
          @actionRemoved="reload()"
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
import CropZoomKeyboardShortcutEntry from './Components/CropZoomKeyboardShortcutEntry.vue';
import AspectRatioType from '@src/common/enums/AspectRatioType.enum';
import StretchType from '@src/common/enums/StretchType.enum';
import NewAspectRatioForm from './Components/NewAspectRatioForm.vue';
import { ArVariant } from '@src/common/interfaces/ArInterface';

export default defineComponent({
  components: {
    KeyboardShortcutEntry,
    CropZoomKeyboardShortcutEntry,
    NewAspectRatioForm,

  },
  data() {
    return {
      AspectRatioType: AspectRatioType,
      StretchType: StretchType,
      ArVariant,

      groupVisible: {
        'crop-novariant': true,
        crop: true,
        stretch: true,
        zoom: true,
        'fill-frame': false,
        unconstrained: false,
      },
      state: null,
      optionCache: {
        mousePan: '',
      }
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

    this.optionCache.mousePan = `${this.settings.active.mouseOptions.ctrlPan ? 'ctrl' : ''}${this.settings.active.mouseOptions.shiftPan ? 'shift' : ''}`;
  },
  methods: {
    reload() {
      this.$nextTick( () => {this.$forceUpdate()});
    },
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
    updatePanOptions() {
      this.settings.active.mouseOptions.ctrlPan = this.optionCache.mousePan.includes('ctrl');
      this.settings.active.mouseOptions.shiftPan = this.optionCache.mousePan.includes('shift');
      this.settings.saveWithoutReload();
    },
    addAction(segment: 'stretch' | 'crop' | 'zoom', newCommand: {aspectRatio: string, label: string, shortcut?: any}, otherOptions?: any) {
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

      if (!newCommand.aspectRatio) {
        return;
      }
      const [a, b] = newCommand.aspectRatio.replaceAll(',', '.').split(':');
      let ratioOut;

      if (!b) {
        ratioOut = parseFloat(a);
      } else {
        ratioOut = parseFloat(a) / parseFloat(b);
      }

      const command = {
        action: actionMap[segment],
        label: newCommand.label,
        arguments: {
          type: typeMap[segment],
          ratio: ratioOut,
          ...otherOptions
        },
        shortcut: newCommand.shortcut,
      };

      this.settings.active.commands[segment].push(command);
      this.settings.saveWithoutReload();

      // Adding crop aspect ratio should automatically add other variants as well
      if (segment === 'crop') {
        for (const variant of [undefined, ArVariant.FitVideo, ArVariant.None, ArVariant.FillFrame]) {
          if (variant === otherOptions?.variant) {
            continue;
          }
          const commandVariant = {
            ...command,
            arguments: {
              ...command.arguments,
              variant: variant
            },
            shortcut: undefined,
          }
          this.settings.active.commands[segment].push(commandVariant);
        }
      }
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
