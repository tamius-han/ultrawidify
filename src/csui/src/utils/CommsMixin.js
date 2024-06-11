export default {
  methods: {
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
  }
}
