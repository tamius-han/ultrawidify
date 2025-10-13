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
import EmbeddedContentSettingsOverridePolicy from '../../common/enums/EmbeddedContentSettingsOverridePolicy.enum';

const ExtensionConfPatch = Object.freeze([
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
      console.log('[ultrawidify] Migrating settings — applying patches for version 6.2.6');

      if (!userOptions.commands) {
        userOptions.commands = {
          zoom: [],
          crop: [],
          stretch: [],
          pan: [],
          internal: []
        };
      }

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

      userOptions.dev = {
        loadFromSnapshot: false
      };
      userOptions.ui.dev = {
        aardDebugOverlay: {
          showOnStartup: false,
          showDetectionDetails: true
        }
      }

      const newZoomActions = [{
        action: 'set-zoom',
        label: 'Reset zoom',
        shortcut: {
          key: 'r',
          code: 'KeyR',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyUp: true,
          onKeyDown: false,
        },
        arguments: {
          zoom: 1
        },
        internalOnly: true,
        actionId: 'set-zoom-reset'
      }, {
        action: 'set-ar-zoom',
        label: 'Automatic',
        comment: 'Automatically detect aspect ratio and zoom accordingly',
        arguments: {
          type: AspectRatioType.Automatic
        },
        shortcut: {
          key: 'a',
          code: 'KeyA',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyUp: true,
          onKeyDown: false,
        }
      }, {
        action: 'set-ar-zoom',
        label: 'Cycle',
        comment: 'Cycle through zoom options',
        arguments: {
          type: AspectRatioType.Cycle
        },
        shortcut: {
          key: 'c',
          code: 'KeyC',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyUp: true,
          onKeyDown: false,
        }
      }, {
        action: 'set-ar-zoom',
        label: '21:9',
        comment: 'Zoom for 21:9 aspect ratio (1:2.39)',
        arguments: {
          type: AspectRatioType.Fixed,
          ratio: 2.39
        },
        shortcut: {
          key: 'd',
          code: 'KeyD',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyUp: false,
          onKeyDown: true,
        }
      }, {
        action: 'set-ar-zoom',
        label: '18:9',
        comment: 'Zoom for 18:9 aspect ratio (1:2)',
        arguments: {
          type: AspectRatioType.Fixed,
          ratio: 1.78
        },
        shortcut: {
          key: 's',
          code: 'KeyS',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
          onKeyUp: false,
          onKeyDown: true,
        }
      }, {
        action: 'set-ar-zoom',
        label: '32:9',
        comment: 'Zoom for 32:9 aspect ratio',
        arguments: {
          type: AspectRatioType.Fixed,
          ratio: 3.56
        },
      }];

      const compareShortcuts = (a: any, b: any) => {
        if (!a || !b) {
          return false;
        }

        return a.key === b.key && b.code === b.code && a.ctrlKey == b.ctrlKey && a.shiftKey == b.shiftKey && a.metaKey == a.metaKey && a.altKey == b.altKey;
      }

      const hasConflict = (shortcut: any) => {
        for (const ct in userOptions.commands) {
          for (const command of userOptions.commands[ct]) {
            if (compareShortcuts(shortcut, command.shortcut)) {
              return true;
            }
          }
        }

        return false;
      }

      for (const zoomAction of newZoomActions) {
        if (
          !userOptions.commands.zoom.find(
            x => x.action === zoomAction.action
              && x.arguments?.type === zoomAction.arguments?.type
              && x.arguments?.ratio === zoomAction.arguments?.ratio
          )
        ) {
          userOptions.commands.zoom.push({
            ...zoomAction,
            shortcut: hasConflict(zoomAction.shortcut) ? undefined : zoomAction.shortcut
          });
        }
      }
    }
  }, {
    forVersion: '6.3.92',
    updateFn: (userOptions: SettingsInterface) => {
      // applyToEmbeddedContent is now an enum, and also no longer optional
      for (const site in userOptions.sites) {
        if (userOptions.sites[site].applyToEmbeddedContent === undefined) {
          userOptions.sites[site].applyToEmbeddedContent = EmbeddedContentSettingsOverridePolicy.Always;
        } else {
          userOptions.sites[site].applyToEmbeddedContent = userOptions.sites[site].applyToEmbeddedContent ? EmbeddedContentSettingsOverridePolicy.Always : EmbeddedContentSettingsOverridePolicy.Never;
        }
      }
    }
  },
  {
    forVersion: '6.3.93',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface) => {
      userOptions.arDetect.polling = defaultOptions.arDetect.polling;
      userOptions.arDetect.subtitles = defaultOptions.arDetect.subtitles;
      userOptions.arDetect.autoDisable = defaultOptions.arDetect.autoDisable;
    }
  },
  {
    forVersion: '6.3.97',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface) => {
      userOptions.arDetect.letterboxOrientationScan = defaultOptions.arDetect.letterboxOrientationScan;
      userOptions.arDetect.edgeDetection = defaultOptions.arDetect.edgeDetection;
      userOptions.arDetect.subtitles = defaultOptions.arDetect.subtitles;
    }
  }

]);


export default ExtensionConfPatch;
