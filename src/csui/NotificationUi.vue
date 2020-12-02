<template>
  <div v-if="showNotification" class="root-window flex flex-column overflow-hidden">
    <div class="notification-popup flex flex-row">
      <div v-if="notificationIcon" class="flex-nogrow flex-noshrink notification-icon">
        <Icon
          class="flex-nogrow flex-noshrink"
          :icon="notificationIcon"
          @click="closeNotification()"
        >
        </Icon>
      </div>
      <div class="notification-context flex-grow flex-shrink flex flex-column">
        <div
          class="notification-text"
          v-html="notificationText"
        >
        </div>
        <div 
          v-if="notificationActions"
          class="action-buttons flex flex-row"
        >
          <div 
            v-for="action of notificationActions"
            :key="action"
            @click="action.command"
          >
            <Icon v-if="action.icon" :icon="action.icon"></Icon>{{action.label}}
          </div>
        </div>
      </div>
      <div class="notification-icon">
        <Icon
          class="flex-nogrow flex-noshrink"
          icon="x"
          @click="closeNotification()"
        >
        </Icon>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from '../common/components/Icon';

export default {
  components: {
    Icon,
  },
  data() {
    return {
      // notificationIcon: null,
      // notificationText: null,
      // notificationActions: null,
      // showNotification: false,
      notificationTimeout: null,
      notificationIcon: "exclamation-triangle",
      notificationText: "this is a test notification <b>with some html for bold measure</b>",
      notificationActions: null,
      showNotification: true,
    }
  },
  ...mapState([
    'notificationConfig'
  ]),
  watch: {
    /**
     * Sets new notification config. Currently, we can only show one notification at a time.
     * 
     * We expect a config object like this:
     * {
     *    timeout: number  — how long we'll be displaying the notification. If empty, 10s. -1: until user dismisses it
     *    icon: string     — what icon we're gonna show. We're using bootstrap icons. Can be empty.
     *    text:            — notification text. Supports HTML.
     *    notificationActions: [
     *      {
     *        command: function that gets executed upon clicking the button.
     *        label: label of the button
     *        icon: icon of the button
     *      }
     *    ]
     * }
     */
    notificationConfig(newConfig) {
      if (newConfig) {
        this.notificationText = newConfig.text;
        this.notificationActions = newConfig.notificationActions;
        this.notificationIcon = newConfig.icon;

        this.showNotification = true;

        if (newConfig.timeout !== -1) {
          this.notificationTimeout = setTimeout(() => this.closeNotification(), newConfig.timeout ?? 10000);
        }
      }
    }
  },
  methods: {
    closeNotification() {
      clearTimeout(this.notificationTimeout);

      this.showNotification = false;
      this.notificationIcon = null;
      this.notificationText = null;
      this.notificationActions = null;
    }
  }
}
</script>

<style lang="scss" scoped>
.root-window {
  position: relative;
  width: 100%;
  height: 100%;
}

.notification-popup {
  position: absolute;
  z-index: 99999999;
  background-color: rgba(0,0,0,0.88);
  top: 2rem;
  left: 2rem;
  width: 15rem;
  color: #fff;
}
.notification-icon {
  font-size: 3rem;
}
</style>