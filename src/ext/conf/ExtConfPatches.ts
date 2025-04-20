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
import { update } from 'lodash';

const ExtensionConfPatch = [
  {
    forVersion: '6.2.4',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      for (const site in userOptions.sites) {
        userOptions.sites[site].enableUI = {
          fullscreen: ExtensionMode.Default,
          theater: ExtensionMode.Default,
          normal: ExtensionMode.Default,
        }
      }
      const uiEnabled =
      userOptions.sites['@global'].enableUI = {
        fullscreen:  userOptions.ui.inPlayer.enabled ? ExtensionMode.Enabled : ExtensionMode.Disabled,
        theater: ExtensionMode.Enabled,
        normal: (userOptions.ui.inPlayer.enabled && !userOptions.ui.inPlayer.enabledFullscreenOnly) ? ExtensionMode.Enabled : ExtensionMode.Disabled
      }
      userOptions.sites['@empty'].enableUI = {
        fullscreen: ExtensionMode.Default,
        theater: ExtensionMode.Default,
        normal: ExtensionMode.Default,
      }
    }
  }, {
    forVersion: '6.2.6',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      userOptions.commands.zoom = [{
        action: 'change-zoom',
        label: 'Zoom +5%',
        arguments: {
          zoom: 0.05
        },
        shortcut: {
          key: 'z',
          code: 'KeyY',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        },
        internalOnly: true,
        actionId: 'change-zoom-10in'
      }, {
        action: 'change-zoom',
        label: 'Zoom -5%',
        arguments: {
          zoom: -0.05
        },
        shortcut: {
          key: 'u',
          code: 'KeyU',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
          onKeyUp: true,
          onKeyDown: false,
        },
        internalOnly: true,
        actionId: 'change-zoom-10out'
      }, {
        action: 'set-zoom',
        label: 'Reset zoom',
        arguments: {
          zoom: 1,
        },
        internalOnly: true,
        actionId: 'set-zoom-reset'
      }];

      delete (userOptions as any).actions;

      userOptions.ui.dev = {
        aardDebugOverlay: {
          showOnStartup: false,
          showDetectionDetails: true
        }
      }
    }
  }
];


export default ExtensionConfPatch;
