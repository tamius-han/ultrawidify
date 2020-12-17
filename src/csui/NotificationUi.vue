<template>
  <div v-if="showNotification" class="uw-ultrawidify-container flex flex-column overflow-hidden">
    <div class="notification-popup flex flex-row">
      <div v-if="notificationIcon" class="flex-nogrow flex-noshrink notification-icon">
        <Icon
          class="flex-nogrow flex-noshrink"
          :icon="notificationIcon"
        >
        </Icon>
      </div>
      <div class="notification-content flex-grow flex-shrink flex flex-column flex-cross-center">
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
            class="action-button"
            :key="action"
            @click="action.command"
          >
            <Icon v-if="action.icon" :icon="action.icon"></Icon>{{action.label}}
          </div>
        </div>
        <div 
          v-if="hideActions"
          class="hide-actions"
        >
          Never show again:<wbr>&nbsp;
          <template 
            v-for="action of hideActions"
            :key="action"
          >
            <i @click="closeNotification">
              <a 
                class="hide-action-button"
                @click="action.command"
              >
                {{action.label}}
              </a>
              <wbr>&nbsp;
            </i>
          </template>
        </div>
      </div>
      <div
        class="notification-icon action-button"
          @click="closeNotification()"
      >
        <Icon
          class="flex-nogrow flex-noshrink"
          icon="x"
        >
        </Icon>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';

export default {
  components: {
    Icon,
  },
  data() {
    return {
      notificationTimeout: null,
      notificationIcon: "exclamation-triangle",
      notificationText: "<b>Sample text.</b> This will be replaced with real notification later.",
      notificationActions: null,
      hideActions: null,
      showNotification: false,
    };
  },
  computed: {
    ...mapState([
      'notificationConfig'
    ]),
  },
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
     *    ],
     *    hideOptions: [
     *      // more of notificationActions except it's a special case
     *    ]
     * }
     */
    notificationConfig(newConfig) {
      if (newConfig) {
        this.notificationText = newConfig.text;
        this.notificationActions = newConfig.notificationActions;
        this.notificationIcon = newConfig.icon;
        this.hideActions = newConfig.hideActions;

        this.showNotification = true;

        if (newConfig.timeout !== -1) {
          this.notificationTimeout = setTimeout(() => this.closeNotification(), newConfig.timeout ?? 5000);
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
      this.hideActions = null;
    }
  }
}

</script>

<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;

  display: block !important;
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;

  font-size: 16px !important;

  .notification-popup {
    pointer-events: auto !important;
    position: absolute;
    z-index: 99999999;
    top: 2em;
    right: 2em;
    width: 32em;

    padding: 0.7em 0.5em;

    font-family: 'Overpass';

    background-color: rgba(108, 55, 12, 0.779);
    color: #fff;

    user-select: none;
  }

  .notifcation-content {
    margin-left: 0.5em;
  }

  .notification-text {
    text-align: justify;
    padding-left: 0.5em;
    padding-right: 0.25em;
  }
  
  .notification-icon {
    font-size: 3em;
    line-height: 0.5;
  }
  .action-button {
    pointer-events: auto;
    cursor: pointer;
  }

  .hide-actions {
    color: #ccc;
    font-size: 0.8em;
    justify-self: flex-end;
    align-self: flex-end;
    margin-top: 1em;
    margin-bottom: -1em;
  }

  .hide-action-button {
    color: #eee;
    font-size: 0.9em;
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.5);

    pointer-events: auto;
    cursor: pointer;
  }
}
</style>