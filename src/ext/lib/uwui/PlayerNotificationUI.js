import UI from './UI';
import VuexWebExtensions from 'vuex-webextensions';
import VideoNotification from '../../../csui/NotificationUi';

class PlayerNotificationUi extends UI {

  constructor (
    playerElement
  ) {
    super(
      'notification',
      getStoreConfig(),
      getUiConfig(playerElement),
      getCommsConfig()
    )
  }


  //#region constructor helpers
  // we will move some things out of the constructor in order to keep things clean
  getStoreConfig() {
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

  getUiConfig(playerElement) {
    return {
      parentElement: playerElement,
      component: VideoNotification
    }
  }

  getCommsConfig() {
    return {
      handlers: {
        'show-notification': [(message) => this.showNotification(message)],
      }
    }
  }
  //#endregion

  //#region lifecycle
  replace(playerElement) {
    super.replace(this.getUiConfig(playerElement));
  }
  //#endregion

  /**
   * Show notification on screen.
   * 
   * @param notificationConfig notification config
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
   *    ]
   * }
   */
  showNotification(notificationConfig) {
    this.vuexStore?.dispatch('uw-set-notification', notificationConfig);
  }
}

export default PlayerNotificationUi;
