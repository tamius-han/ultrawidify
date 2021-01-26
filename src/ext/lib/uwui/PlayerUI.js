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
            'showUi',
            'resizerDebugData',
            'playerDebugData',
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
        },
        'uw-set-player-debug-data'(state, payload) {
          state['playerDebugData'] = payload;
        },
        'uw-set-resizer-debug-data'(state, payload) {
          state['resizerDebugData'] = payload;
        },
      },
      actions: {
        'uw-set-ui-visible'({commit}, payload) {
          console.log('action!', commit, payload);
          commit('uw-set-ui-visible', payload);
        },
        'uw-toggle-ui'({commit}) {
          commit('uw-toggle-ui');
        },
        'uw-set-player-debug-data'({commit}, payload) {
          commit('uw-set-player-debug-data', payload);
        },
        'uw-set-resizer-debug-data'({commit}, payload) {
          commit('uw-set-resizer-debug-data', payload);
        },
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
    super.replace(this.getUiConfig(playerElement));
  }
  //#endregion

  //#region debug methods
  updateDebugInfo(component, data) {
    this.vuexStore?.dispatch(`uw-set-${component}-debug-data`, data);
  }
  //#endregion
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerUi loaded");
}

export default PlayerUi;
