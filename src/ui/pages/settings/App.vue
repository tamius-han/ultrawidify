<template>
  <div class="w-full flex flex-row w-full h-full justify-center items-center py-4 px-16">

    <!-- page content -->
    <div class="w-full max-w-[1920px]">
      <h1 class="text-[3em]">Ultrawidify settings</h1>

      <div v-if="!settingsInitialized" class="flex flex-row w-full justify-center items-center">
        Loading settings...
      </div>

      <SettingsWindowContent v-else
        :settings="settings"
        :logger="logger"
        :inPlayer="false"
        :site="null"
      >
      </SettingsWindowContent>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';
import Settings from '@src/ext/lib/settings/Settings';
import SettingsWindowContent from '@components/SettingsWindowContent.vue';

export default defineComponent({
  components: {
    SettingsWindowContent
  },
  data () {
    return {
      settings: undefined as Settings | undefined,
      logger: undefined as ComponentLogger | undefined,
      logAggregator: undefined as LogAggregator | undefined,
      settingsInitialized: false,
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    this.settings = new Settings({
      logAggregator: this.logAggregator,
      onSettingsChanged: () => this.updateConfig()
    });
    await this.settings.init();
    this.settingsInitialized = true;
  },
  methods: {
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    }
  }
});
</script>

