// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}
import StretchType from '../../common/enums/StretchType.enum';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import BrowserDetect from './BrowserDetect';
import SettingsInterface from '../../common/interfaces/SettingsInterface';
import { _cp } from '../../common/js/utils';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';

const ExtensionConfPatch = [
  {
    forVersion: '5.0.5',
    sites: {
      "app.plex.tv": {
        mode: 3,
        autoar: 3,
        type: "community",
        stretch: -1,
        videoAlignment: -1,
        keyboardShortcutsEnabled: 0,
        DOM: {
          player: {
            manual: false,
            querySelectors: "",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: ""
          }
        },
        css: "body {\n  background-color: #000;\n}\n\n.application {\n  background-color: #000;\n}"
      }
    }
  }, {
    forVersion: '5.0.6',
    sites: {
      "metaivi.com": {
        mode: 0,
        autoar: 0,
        type: "community",
        stretch: -1,
        videoAlignment: -1,
        DOM: {
          video: {
            manual: false,
            querySelectors: "",
            additionalCss: "position: absolute !important;"
          },
          player: {
            manual: false,
            querySelectors: "",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: ""
          }
        },
        "css": ""
      },
      "piped.kavin.rocks": {
        mode: 0,
        autoar: 0,
        type: 'community',
        autoarFallback: 0,
        stretch: 0,
        videoAlignment: -1,
        keyboardShortcutsEnabled: 0,
        DOM: {
          player: {
            manual: false,
            querySelectors: "",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: ""
          }
        },
        css: ".shaka-video-container {\n  flex-direction: column !important;\n}"
      },
    },
    updateFn: (userOptions, defaultOptions) => {
      // 5.0.5 initially incorrectly had app.plex.tv marked as 'user-added'
      // when 'user-added' is generally reserved for marking sites with user-
      // changed configuration. Site patches submitted by community should have
      // 'community' type. extConfPatch for 5.0.5 was also retroactively corrected.
      userOptions.sites['app.plex.tv'].type = 'community';
      userOptions.sites['piped.kavin.rocks'] = {
        mode: 0,
        autoar: 0,
        type: 'community',
        autoarFallback: 0,
        stretch: 0,
        videoAlignment: -1,
        keyboardShortcutsEnabled: 0,
        DOM: {
          player: {
            manual: false,
            querySelectors: "",
            additionalCss: "",
            useRelativeAncestor: false,
            playerNodeCss: ""
          }
        },
        css: ".shaka-video-container {\n  flex-direction: column !important;\n}"
      };
    }
  }, {
    forVersion: '5.0.7',
    updateFn: (userOptions, defaultOptions) => {
      // 5.0.5 initially incorrectly had app.plex.tv marked as 'user-added'
      // when 'user-added' is generally reserved for marking sites with user-
      // changed configuration. Site patches submitted by community should have
      // 'community' type. extConfPatch for 5.0.5 was also retroactively corrected.
      userOptions.sites['www.youtube.com'].DOM.player = {
        manual: true,
        querySelectors: "#movie_player, #player, #c4-player",
        additionalCss: "",
        useRelativeAncestor: false,
        playerNodeCss: "",
      }
    }
  }, {
    forVersion: '5.0.8',
    updateFn: (userOptions, defaultOptions) => {
      userOptions.sites['www.netflix.com'].DOM.player = {
        manual: false
      }
    }
  }, {
    forVersion: '5.99.0-1',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      // add new commands
      userOptions.commands = defaultOptions.commands;
    }
  }, {
    // NOTE - when releasing shit, ensure ALL alpha migrations are combined together in one function
    forVersion: '5.99.0-2',
    updateFn: (userOptions, defaultOptions) => {
      userOptions.commands = defaultOptions.commands;

      // migrates old settings regarding whether extension is enabled or not
      const copyEnabled = (site) => {
        userOptions.sites[site].enable = {
          fullscreen: userOptions.sites[site].mode,
          theater: userOptions.sites[site].mode,
          normal: ExtensionMode.Disabled
        };
        userOptions.sites[site].enableKeyboard = {
          fullscreen: userOptions.sites[site].keyboardShortcutsEnabled,
          theater: userOptions.sites[site].keyboardShortcutsEnabled,
          normal: ExtensionMode.Disabled
        };
        userOptions.sites[site].enableAard = {
          fullscreen: userOptions.sites[site].autoar,
          theater: userOptions.sites[site].autoar,
          normal: ExtensionMode.Disabled
        };

        userOptions.sites[site].stretchModePersistence = userOptions.sites[site].cropModePersistence;

        // remove old options
        delete userOptions.sites[site].mode;
        delete userOptions.sites[site].keyboardShortcutsEnabled;
        delete userOptions.sites[site].autoar;
      }

      // globals get carried over before other sites:
      copyEnabled('@global');

      // we make another guess about a new option we just added


      for (const key in userOptions.sites) {
        // we already had this
        if (key === '@global') {
          continue;
        }

        copyEnabled(key);

        userOptions.sites[key].DOMConfig = _cp(defaultOptions.sites[key].DOMConfig)

        // convert old site.DOM to site.DOMConfig[]
        if (userOptions.sites[key].type === 'user-defined') {
          const DOM = userOptions.sites[key].DOM;
          if (DOM) {
            userOptions.sites[key].DOMConfig['user-defined'] = {
              type: 'user-1',
              customCss: DOM?.css,
              periodicallyRefreshPlayerElement: DOM?.player?.periodicallyRefreshPlayerElement,
              elements: !(DOM?.player) ? undefined : {
                player: {
                  manual: DOM?.player?.manual,
                  querySelectors: DOM?.player?.useRelativeAncestor ? undefined : DOM?.player?.querySelectors,
                  index: DOM?.player?.useRelativeAncestor ? DOM?.player?.videoAncestor : undefined,
                }
              }
            }
            userOptions.sites[key].activeDOMConfig = 'user-1';

            // remove old configuration
            delete userOptions.sites[key].DOM;
          }
        }
      }
    }
  }, {
    forVersion: '5.99.0-3',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      delete (userOptions as any).sites['@global'].persistOption;
      delete (userOptions as any).sites['@empty'].persistOption;

      userOptions.sites['@global'].persistCSA = CropModePersistence.Disabled;
      userOptions.sites['@empty'].persistCSA = CropModePersistence.Disabled;
    }
  },  {
    forVersion: '5.99.0-4',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {

      // deprecated much?
      userOptions.actions.push({
        name: 'Cycle aspect ratio',
        label: 'Cycle',
        cmd: [{
          action: 'set-ar',
          arg: AspectRatioType.Cycle
        }]
      });
      userOptions.commands.crop.push({
        action: 'set-ar',
        label: 'Cycle',
        comment: 'Cycle through crop options',
        arguments: {
          type: AspectRatioType.Cycle
        },
        shortcut: {
          key: 'c',
          code: 'KeyC',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        }
      });
    }
  }
];


export default ExtensionConfPatch;
