<template>
  <div class="w-full flex flex-row justify-between items-start border-b border-b-stone-700">
    <div class="flex flex-col grow items-baseline grow px-4">
      <div class="flex flex-row">
        <h1 class="text-[3rem] text-white">Ultrawidify</h1><small v-if="settingsInitialized">{{settings.getExtensionVersion()}}-{{BrowserDetect.processEnvBrowser}}</small>
      </div>
      <div class="flex flex-row items-center gap-4 -mt-4">
        <div>{{site?.host}}</div>
        <SupportLevelIndicator
          :siteSettings="siteSettings"
        ></SupportLevelIndicator>
      </div>
    </div>
    <div class="pt-4 pb-2 flex flex-col justify-start mr-8">
      <div class="
        flex flex-row
        font-semibold
      ">
        <div
          class="
            pl-3 pr-4 py-2 flex flex-row items-center
            bg-black text-stone-400 border border-stone-500
            hover:text-white hover:border-white
          "
          @click="showInPlayerUi()"
        >
          <mdicon name="cog" size="24" class="mr-1"></mdicon>
          Open settings window
        </div>
        <div class="
          dropdown-parent
          relative
          py-2 bg-black text-stone-400 border border-stone-500
          hover:text-white hover:border-white
          transition-transform duration-100
        ">
          <mdicon name="chevron-down" size="24" class="group-hover:rotate-90"></mdicon>
          <div
            class="
              open-settings-popup
              bg-black text-stone-400 border border-stone-500
              absolute top-0 right-[2rem]
              hidden w-48
              group-hover:flex group-hover:flex-col
              hover:flex hover:flex-col
            "
          >
            <div
              @click="showInPlayerUi()"
            >
              Open settings in-page
            </div>
            <div
              @click="openSettingsInTab()"
            >
              Open settings in a new tab
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import SupportLevelIndicator from '@components/common/SupportLevelIndicator.vue';


export default defineComponent({
  components: {

    SupportLevelIndicator
  },
  props: [
    'settings',
    'siteSettings',
    'eventBus',
    'site'
  ],
  data() {
    return {
      BrowserDetect,
    }
  },
  methods: {
    showInPlayerUi() {
      this.eventBus.send('uw-show-settings-window', {initialState: '', allFrames: true}, {comms: {forwardTo: 'active'}});
    },
    openSettingsInTab() {
      chrome.runtime.openOptionsPage();
    }
  }
})
</script>
<style lang="postcss" scoped>
@import '@src/main.css'; /** postcss processor doesn't support aliases */

.open-settings-popup {
  width: 16rem;
}

.dropdown-parent:hover {
  .mdi {
    @apply rotate-90;
  }

  .open-settings-popup {
    @apply flex flex-col border-white -mt-[1px];

    div {
      @apply w-full hover:text-white cursor-pointer px-4 py-1 hover:bg-stone-800;
    }
  }
}

</style>
