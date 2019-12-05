// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}
import Stretch from '../../common/enums/stretch.enum';

const ExtensionConfPatch = [
  {
    forVersion: '4.2.0',
    sites: {
      "old.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: true,
            useRelativeAncestor: false,
            querySelectors: '.reddit-video-player-root, .media-preview-content'
          }
        },
        css: '',
      },
      "www.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: true,
            useRelativeAncestor: false,
            querySelectors: '.reddit-video-player-root, .media-preview-content'
          }
        },
        css: '',
      },
      "www.youtube.com" : {
        DOM: {
          player: {
            manual: true,
            querySelectors: "#movie_player, #player",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: "",
          }
        }
      },
    }
  }, {
    forVersion: '4.2.3.1',
    sites: {
      "old.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: true,
            useRelativeAncestor: false,
            querySelectors: '.media-preview-content, .reddit-video-player-root'
          }
        },
        css: '',
      },
      "www.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: true,
            useRelativeAncestor: false,
            querySelectors: '.media-preview-content, .reddit-video-player-root'
          }
        },
        css: '',
      },
      "www.youtube.com" : {
        DOM: {
          player: {
            manual: true,
            querySelectors: "#movie_player, #player",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: "",
          }
        }
      },
    }
  }, {
    forVersion: '4.3.0',
    sites: {
      "old.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: false,
            useRelativeAncestor: false,
            querySelectors: '.reddit-video-player-root, .media-preview-content'
          }
        },
        css: 'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
      },
      "www.reddit.com" : {
        type: 'testing',
        DOM: {
          player: {
            manual: false,
            useRelativeAncestor: false,
            querySelectors: '.reddit-video-player-root, .media-preview-content'
          }
        },
        css: 'video {\n  width: 100% !important;\n  height: 100% !important;\n}',
      },
    }
  }, {
    forVersion: '4.3.1.1',
    sites: {
      'www.twitch.tv': {
        DOM: {
          player: {
            manual: false,
            querySelectors: "",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: ""
          }
        }
      }
    }
  }, {
    forVersion: '4.4.0',
    updateFn: (userOptions, defaultOptions) => {
      // remove 'press P to toggle panning mode' thing
      const togglePan = userOptions.actions.find(x => x.cmd && x.cmd.length === 1 && x.cmd[0].action === 'toggle-pan');
      if (togglePan) { 
        togglePan.scopes = {};
      }

      // add new actions
      userOptions.actions.push({
        name: 'Don\'t persist crop',
        label: 'Never persist',
        cmd: [{
          action: 'set-ar-persistence',
          arg: 0,
        }],
        scopes: {
          site: {
            show: true,
          },
          global: {
            show: true,
          }
        },
        playerUi: {
          show: true,
        }
      }, {
        userAdded: true,
        name: 'Persist crop while on page',
        label: 'Until page load',
        cmd: [{
          action: 'set-ar-persistence',
          arg: 1,
        }],
        scopes: {
          site: {
            show: true,
          },
          global: {
            show: true,
          }
        },
        playerUi: {
          show: true,
        }
      }, {
        userAdded: true,
        name: 'Persist crop for current session',
        label: 'Current session',
        cmd: [{
          action: 'set-ar-persistence',
          arg: 2,
        }],
        scopes: {
          site: {
            show: true,
          },
          global: {
            show: true,
          }
        },
        playerUi: {
          show: true,
        }
      }, {
        name: 'Persist until manually reset',
        label: 'Always persist',
        cmd: [{
          action: 'set-ar-persistence',
          arg: 3,
        }],
        scopes: {
          site: {
            show: true,
          },
          global: {
            show: true,
          }
        },
        playerUi: {
          show: true,
        }
      }, {
        name: 'Default crop persistence',
        label: 'Default',
        cmd: [{
          action: 'set-ar-persistence',
          arg: -1,
        }],
        scopes: {
          site: {
            show: true,
          },
        },
        playerUi: {
          show: true,
        }
      });
      
      // patch shortcuts for non-latin layouts, but only if the user hasn't changed default keys
      for (const action of userOptions.actions) {
        if (!action.cmd || action.cmd.length !== 1) {
          continue;
        }
        try {
          // if this fails, then action doesn't have keyboard shortcut associated with it, so we skip it

          const actionDefaults = defaultOptions.actions.find(x => x.cmd && x.cmd.length === 1  // (redundant, default actions have exactly 1 cmd in array)
                                                                        && x.cmd[0].action === action.cmd[0].action
                                                                        && x.scopes.page
                                                                        && x.scopes.page.shortcut
                                                                        && x.scopes.page.shortcut.length === 1
                                                                        && x.scopes.page.shortcut[0].key === action.scopes.page.shortcut[0].key // this can throw exception, and it's okay
                                                             );
          if (actionDefaults === undefined) {
            continue;
          }
          // update 'code' property for shortcut
          action.scopes.page.shortcut[0]['code'] = actionDefaults.scopes.page.shortcut[0].code;
        } catch (e) {
          continue;
        }
      }
    }
  }, {
    forVersion: '4.4.1.1',
    sites: {
      "www.disneyplus.com": {
        DOM: {
          player: {
            periodicallyRefreshPlayerElement: true,
          }
        }
      },
    }
  }, {
    forVersion: '4.4.2',
    updateFn: (userOptions, defaultOptions) => {
      try {
        userOptions.actions.push(
          { 
            name: 'Stretch source to 4:3',
            label: '4:3 stretch (src)',
            cmd: [{
              action: 'set-stretch',
              arg: Stretch.FixedSource,
              customArg: 1.33,
            }],
            scopes: {
              page: {
                show: true
              }
            },
            playerUi: {
              show: true,
              path: 'crop'
            }
          }, { 
            name: 'Stretch source to 16:9',
            label: '16:9 stretch (src)',
            cmd: [{
              action: 'set-stretch',
              arg: Stretch.FixedSource,
              customArg: 1.77,
            }],
            scopes: {
              page: {
                show: true,
              }
            },
            playerUi: {
              show: true,
              path: 'crop'
            }
        });
      } catch (e) {
        console.error("PROBLEM APPLYING SETTINGS", e);
      }
    }
  }
];


export default ExtensionConfPatch;