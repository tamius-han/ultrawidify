import UI from './UI';
import VuexWebExtensions from 'vuex-webextensions';
import PlayerUiComponent from '../../../csui/PlayerUiComponent.vue';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: PlayerUi");
}

/**
 * Class that handles in-player UI
 */
class PlayerUi extends UI {

  /**
   * Creates new in-player UI for ultrawidify
   * @param {*} playerElement PlayerUI will be created as a child of this element
   * @param {*} settings Extension settings (instanceof Settings)
   */
  constructor (
    playerElement,
    settings
  ) {    
    super(
      'ultrawidifyUi',
      PlayerUi.getStoreConfig(),
      PlayerUi.getUiConfig(playerElement),
      PlayerUi.getCommsConfig()
    );

    this.settings = settings;
  }


  //#region constructor helpers
  // we will move some things out of the constructor in order to keep things clean
  static getStoreConfig() {
    // NOTE: these are sample values and can be deleted. Currently, they're commented out
    //       so we won't have to look up the documentation in order to get them working
    return {
      plugins: [
        VuexWebExtensions({
          persistentStates: [
            'showUi'
          ],
        }),
      ],
      state: {
        showUi: true,
      },
      mutations: {
        'uw-toggle-ui'(state) {
          state['showUi'] = !state['showUi'];
        },
        'uw-set-ui-visible'(state, payload) {
          state['showUi'] = payload;
        }
      },
      actions: {
        'uw-set-ui-visible'({commit}, payload) {
          commit('uw-set-ui-visible', payload);
        },
        'uw-toggle-ui'({commit}) {
          commit('uw-toggle-ui');
        }
      }
    };
  }

  static getUiConfig(playerElement) {
    return {
      parentElement: playerElement,
      component: PlayerUiComponent
    }
  }

  static getCommsConfig() {
    // NOTE: these are sample values and can be deleted. Currently, they're commented out
    //       so we won't have to look up the documentation in order to get them working
    return {
      handlers: {
        // 'show-notification': [(message) => this.showNotification(message)],
      }
    }
  }
  //#endregion

  //#region lifecycle
  replace(playerElement) {
    try {
      super.replace(this.getUiConfig(playerElement));
    } catch (e) {
      this.logger.log('error', 'Couldn\'t replace player element for ui. Error:', e);
    }
  }
  //#endregion
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerUi loaded");
}

export default PlayerUi;
