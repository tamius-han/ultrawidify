<template>
  this will be a settings page.
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';
import Settings from '@src/ext/lib/settings/Settings';

export default defineComponent({
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
  components: {
  },
  methods: {
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    }
  }
});
</script>

