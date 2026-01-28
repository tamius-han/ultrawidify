<script lang="ts">
export default {
  methods: {

    /**
     * Sends commands to main content script in parent iframe
     * @param {*} command
     */
    execAction(command) {
      const cmd = JSON.parse(JSON.stringify(command));
      this.eventBus?.send(cmd.action, cmd.arguments);
    },
  }
}
</script>
