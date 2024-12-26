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
    forVersion: '6.0.1-1',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      // add new commands
      userOptions.commands = defaultOptions.commands;
    }
  }, {
    // NOTE - when releasing shit, ensure ALL alpha migrations are combined together in one function
    forVersion: '6.0.1-2',
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
    forVersion: '6.0.1-3',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      delete (userOptions as any).sites['@global'].persistOption;
      delete (userOptions as any).sites['@empty'].persistOption;

      userOptions.sites['@global'].persistCSA = CropModePersistence.Disabled;
      userOptions.sites['@empty'].persistCSA = CropModePersistence.Disabled;
    }
  },  {
    forVersion: '6.0.1-4',
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
      userOptions.commands.crop.push({
        action: 'set-ar',
        label: '32:9',
        comment: 'Crop for 32:9 aspect ratio',
        arguments: {
          type: AspectRatioType.Fixed,
          ratio: 3.56
        },
      })
    }
  }, {
    forVersion: '6.0.1-5',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      if (!userOptions.sites['@global'].defaults.alignment || !userOptions.sites['@global'].defaults.alignment.x || !userOptions.sites['@global'].defaults.alignment.y) {
        userOptions.sites['@global'].defaults.alignment = {
          x: VideoAlignmentType.Center,
          y: VideoAlignmentType.Center
        };
      }
      userOptions.sites['@empty'].defaults.alignment = {x: VideoAlignmentType.Default, y: VideoAlignmentType.Default};
    }
  }, {
    forVersion: '6.0.1-6',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      for (const site in userOptions.sites) {
        userOptions.sites[site].defaultType = userOptions.sites[site].type as any;
      }
      userOptions.sites['@global'].defaultType = 'unknown';
      userOptions.sites['@empty'].defaultType = 'modified';
    }
  }, {
    forVersion: '6.0.2-0',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      // remove custom CSS, as it is no longer needed
      for (const site in userOptions.sites) {
        for (const domOption in userOptions.sites[site].DOMConfig)
        userOptions.sites[site].DOMConfig[domOption].customCss;
      }
      userOptions.arDetect.aardType = 'auto';
      userOptions.ui = {
        inPlayer: {
          enabled: true, // enable by default on new installs
          enabledFullscreenOnly: false,
          minEnabledWidth: 0.75,
          activation: 'player',
          popupAlignment: 'left',
          triggerZoneDimensions: {
            width: 0.5,
            height: 0.5,
            offsetX: -50,
            offsetY: 0,
          }
        }
      },
      userOptions.newFeatureTracker['uw6.ui-popup'] = {show: 10};
    }
  }
];


export default ExtensionConfPatch;
