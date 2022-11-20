<template>
  <div class="flex flex-row flex-wrap" style="padding-bottom: 20px">

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
  </div>

</template>
