// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}
import StretchType from '../../common/enums/StretchType.enum';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import BrowserDetect from './BrowserDetect';

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
              arg: StretchType.FixedSource,
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
              arg: StretchType.FixedSource,
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
  }, {
    forVersion: '4.4.3.1',
    sites: {
      "www.disneyplus.com": {
        mode: ExtensionMode.Enabled,
        autoar: ExtensionMode.Enabled,
        autoarFallback: ExtensionMode.Enabled,
        override: true,                  // ignore value localStorage in favour of this
        stretch: StretchType.Default,
        videoAlignment: VideoAlignmentType.Default,
        keyboardShortcutsEnabled: ExtensionMode.Default,
        DOM: {
          player: {
            periodicallyRefreshPlayerElement: true,
          }
        }
      }
    }
  }, {
    forVersion: '4.4.7',
    updateFn: (userOptions, defaultOptions) => {
      if (!userOptions.sites['www.netflix.com'].DOM) {
        userOptions.sites['www.netflix.com']['DOM'] = {
          "player": {
            "manual": true,
            "querySelectors": ".VideoContainer",
            "additionalCss": "",
            "useRelativeAncestor": false,
            "playerNodeCss": ""
          }
        }
      }
      if (!userOptions.sites['www.disneyplus.com']) {
        userOptions.sites['www.disneyplus.com'] = {
          mode: ExtensionMode.Enabled,
          autoar: ExtensionMode.Enabled,     
          override: false,
          type: 'community',
          stretch: StretchType.Default,
          videoAlignment: VideoAlignmentType.Default,
          keyboardShortcutsEnabled: ExtensionMode.Default,
          arPersistence: true,              // persist aspect ratio between different videos
          autoarPreventConditions: {        // prevents autoar on following conditions
            videoStyleString: {             // if video style string thing does anything of what follows
              containsProperty: {           // if video style string has any of these properties (listed as keys)
                'height': {                 // if 'height' property is present in style attribute, we prevent autoar from running
                  allowedValues: [          // unless attribute is equal to anything in here. Optional.
                    '100%'
                  ]
                }
                // 'width': true            // this would prevent aard from running if <video> had a 'width' property in style, regardless of value
                                            // could also be an empty object, in theory.
              }
            }
          },
          DOM: {
            "player": {
              "manual": true,
              "querySelectors": ".btn-media-clients",
              "additionalCss": "",
              "useRelativeAncestor": false,
              "playerNodeCss": ""
            }
          }
        }
      } else {
        userOptions.sites['wwww.disneyplus.com']['DOM'] = {
          "player": {
            "manual": true,
            "querySelectors": ".btn-media-clients",
            "additionalCss": "",
            "useRelativeAncestor": false,
            "playerNodeCss": ""
          }
        }
      }
    }
  }, {
    forVersion: '4.4.9',
    sites: {
      "www.youtube.com": {
        override: true,
        DOM: {
          player: {
            manual: true
          }
        }
      }
    }
  }, {
    forVersion: '4.5.0',
    sites: {
      "www.wakanim.tv": {
        type: 'community',
        DOM: {
          player: {
            manual: true,
            querySelectors: "#jwplayer-container",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: "",
          }
        }
      }
    }
  }, {
    forVersion: '4.5.1',
    updateFn: (userOptions, defaultOptions) => {
      for (const site in userOptions.sites) {
        try {
          delete userOptions[sites].autoarPreventConditions
        } catch (e) {
          // doesn't matter if site doesn't have that option,
          // everything is still fine
        }
      }
    }
  }, {
    forVersion: '4.5.1.1',
    updateFn: (userOptions, defaultOptions) => {
      if (!userOptions.sites['streamable.com']) {
        userOptions.sites['streamable.com'] = {
          mode: 3,
          autoar: 3,
          type: 'official',
          stretch: -1,
          videoAlignment: -1,
          keyboardShortcutsEnabled: 0,
          css: ".player {text-align: left}"
        };
      }
      if (!userOptions.sites['streamable.com'].css) {
        userOptions.sites['streamable.com'].css = '.player {text-align: left}'
      };
    }
  }, {
    forVersion: '4.5.1.3',
    updateFn: (userOptions, defaultOptions) => {
      try {
        userOptions.sites['wwww.disneyplus.com']['css'] = ".hudson-container {\n  height: 100%;\n}";
      } catch (e) {
        // do nothing if disney+ is missing
      }
    }
  }, {
    forVersion: '5.0.1',
    updateFn: (userOptions, defaultOptions) => {
      try {
        userOptions.mitigations = {
          zoomLimit: {
            enabled: BrowserDetect.edge || BrowserDetect.isEdgeUA,
            limit: 0.997,
            fullscreenOnly: true
          }
        } 
      } catch (e) {
        // do nothing
      }
    }
  }, {
    forVersion: '5.0.1.1',
    updateFn: (userOptions, defaultOptions) => {
      try {
        userOptions.mitigations = {
          zoomLimit: {
            enabled: true,
            limit: 0.997,
            fullscreenOnly: true
          }
        } 
      } catch (e) {
        // do nothing
      }
    }
  }, {
    forVersion: '5.0.2',
    updateFn: (userOptions, defaultOptions) => {
      try {
        if (! userOptions.mitigations) {
          userOptions.mitigations = {
            zoomLimit: {
              enabled: true,
              limit: 0.997,
              fullscreenOnly: true
            }
          } 
        } else if (BrowserDetect.chrome) {
          userOptions.mitigations = {
            zoomLimit: {
              enabled: true,
              limit: 0.997,
              fullscreenOnly: true
            }
          } 
        }
      } catch (e) {
        // do nothing
      }
    }
  }, {
    forVersion: '5.0.4',
    updateFn: (userOptions, defaultOptions) => {
      try {
        userOptions.sites['wwww.disneyplus.com'].DOM.player = {
          ... userOptions.sites['wwww.disneyplus.com'].DOM.player,
          querySelectors: ".btm-media-client-element",
          useRelativeAncestor: false,
          videoAncestor: 1
        }
      } catch (e) {
        // do nothing
      }
    }
  }
];


export default ExtensionConfPatch;