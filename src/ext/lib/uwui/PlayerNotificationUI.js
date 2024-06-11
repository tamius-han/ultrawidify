import UI from './UI';
import VuexWebExtensions from 'vuex-webextensions';
import NotificationUi from '../../../csui/NotificationUi.vue';
import Notifications from '../../../common/data/notifications';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: PlayerNotificationUi");
}

let MuteScope = Object.freeze({
  CurrentSite: 'current-site',
  Global: 'global'
});

class PlayerNotificationUi extends UI {

  constructor (
    playerElement,
    settings,
    eventBus,
  ) {
    super(
      'notification',
      PlayerNotificationUi.getStoreConfig(),
      PlayerNotificationUi.getUiConfig(playerElement),
      PlayerNotificationUi.getCommsConfig(),
      { eventBus }
    );

    this.settings = settings;
    this.eventBus = eventBus;
  }


  //#region constructor helpers
  // we will move some things out of the constructor in order to keep things clean
  static getStoreConfig() {
    return {
      plugins: [
        VuexWebExtensions({
          persistentStates: [
            'notificationConfig'
          ],
        }),
      ],
      state: {
        // should be null by default!
        notificationConfig: {
          text: 'sample text <b>now with 100% more html formatting!</b>',
          icon: 'exclamation-circle',
          timeout: 5000,
        }
      },
      mutations: {
        'uw-set-notification'(state, payload) {
          state['notificationConfig'] = payload;
        }
      },
      actions: {
        'uw-set-notification'({commit}, payload) {
          commit('uw-set-notification', payload);
        }
      }
    };
  }

  static getUiConfig(playerElement) {
    return {
      parentElement: playerElement,
      component: NotificationUi
    }
  }

  static getCommsConfig() {
    return {
      handlers: {
        'show-notification': [(message) => this.showNotification(message)],
      }
    }
  }
  //#endregion

  //#region lifecycle
  replace(playerElement) {
    super.replace(PlayerNotificationUi.getUiConfig(playerElement));
  }
  //#endregion

  /**
   * Show notification on screen.
   *
   * @param notificationConfig notification config (or ID of notification config in /common/data/notifications.js)
   *
   * notificationConfig should resemble this:
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
   *    hideActions: [
   *      // more of notificationActions but with special case
   *    ]
   * }
   *
   * When notificationConfig is a string, the function will add two additional notifications on the notificationActionsPile
   *    * never show this notification ever again on any site
   *    * never show this notification again on this site
   */
  showNotification(notificationConfig) {
    if (typeof notificationConfig === 'string') {
      try {
        const config = Notifications[notificationConfig];

        // this should _never_ appear on production version of the extension, but it should help with development.
        if (!config) {
          return this.vuexStore?.dispatch('uw-set-notification', {
            icon: 'x-circle-fill',
            text: `Notification for key ${notificationConfig} does not exist.`,
            timeout: -1,
          });
        }

        // don't show notification if it's muted
        if (this.isNotificationMuted(notificationConfig)) {
          return;
        }

        this.vuexStore?.dispatch('uw-set-notification', {
          ...config,
          hideActions: [
            {
              command: () => this.muteNotification(notificationConfig, MuteScope.CurrentSite),
              label: 'this site'
            },
            {
              command: () => this.muteNotification(notificationConfig, MuteScope.Global),
              label: 'never ever'
            }
          ]
        });
      } catch (e) {
        console.error('theres been an error:', e)
      }
    } else {
      this.vuexStore?.dispatch('uw-set-notification', notificationConfig);
    }
  }

  muteNotification(notificationId, scope) {
    // ensure objects we try to set exist
    if (!this.settings.active.mutedNotifications) {
      this.settings.active.mutedNotifications = {};
    }
    if (!this.settings.active.mutedNotifications[notificationId]) {
      this.settings.active.mutedNotifications[notificationId] = {};
    }

    // actually mute notification
    if (scope === MuteScope.Global) {
      this.settings.active.mutedNotifications[notificationId].$global = true;
    } else {
      this.settings.active.mutedNotifications[notificationId][window.location.hostname] = true;
    }

    // persist settings
    this.settings.saveWithoutReload();
  }

  isNotificationMuted(notificationId) {
    return this.settings.active.mutedNotifications?.[notificationId]?.$global
      || this.settings.active.mutedNotifications?.[notificationId]?.[window.location.hostname];
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerNotificationUi loaded");
}


export default PlayerNotificationUi;
