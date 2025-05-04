<template>
  <div class="flex flex-col">
    <div>Ultrawidify</div>
    <div class="flex flex-row">
      <div v-if="notification.icon">
        <mdicon :name="notification.icon"></mdicon>
      </div>
      <div class="flex flex-grow flex-col">
        <div v-if="notification.title">{{notification.title}}</div>
        <div v-if="notification.description">{{notification.description}}</div>
      </div>
    </div>
    <div v-if="notification.actions" class="flex flex-row flex-end">
      <button
        v-for="(action, index) of notification.actions"
        :key="index"
      >
        {{ action.label }}
      </button>
    </div>
    <div>Notification countdown</div>
  </div>
</template>

<script>


export default {
  components: {
  },
  mixins: [
  ],
  data() {
    return {
      notification: {}
    };
  },
  computed: {

  },
  watch: {
  },
  async created() {
    this.logger = new Logger();

    window.addEventListener('message', this.handleMessage);
    this.sendToParentLowLevel('init-complete', {});
  },
  destroyed() {
    window.removeEventListener('message', this.handleMessage);
  },
  methods: {
    /**
     * Mostly intended to process messages received via window.addEventListener('message').
     * This method should include minimal logic — instead, it should only route messages
     * to the correct function down the line.
     */
    handleMessage(event) {
      switch (event.data.action) {
        case 'notification-data':
          this.notification = event.data.payload;
      }
    },

    /**
     * Sends message to parent _without_ using event bus.
     */
    sendToParentLowLevel(action, payload, lowLevelExtras = {}) {
      window.parent.postMessage(
        {
          action, payload, ...lowLevelExtras
        },
        '*'
      );
    },
  }
}
</script>
<style lang="scss">
.ard-blocked {
  color: rgb(219, 125, 48) !important;
  background-color: rgba(0,0,0,0.85) !important;
}
</style>

<style lang="scss" src="../../src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="../../src/res-common/common.scss" scoped module></style>

<style lang="scss" scoped>

</style>
