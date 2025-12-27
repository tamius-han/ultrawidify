// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}
import StretchType from '../../common/enums/StretchType.enum';
// import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import BrowserDetect from './BrowserDetect';
import SettingsInterface, { SiteSettingsInterface } from '../../common/interfaces/SettingsInterface';
import { _cp } from '../../common/js/utils';
import CropModePersistence from '../../common/enums/CropModePersistence.enum';
import AspectRatioType from '../../common/enums/AspectRatioType.enum';
import { update } from 'lodash';
import EmbeddedContentSettingsOverridePolicy from '../../common/enums/EmbeddedContentSettingsOverridePolicy.enum';
import LegacyExtensionMode from '../../common/enums/LegacyExtensionMode.enum';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import { PlayerDetectionMode } from '../../common/enums/PlayerDetectionMode.enum';
import { SiteSupportLevel } from '../../common/enums/SiteSupportLevel.enum';


const ExtensionConfPatch = Object.freeze([
  {
    forVersion: '6.2.4',
    updateFn: (userOptions: any, defaultOptions, logger?) => {
      for (const site in userOptions.sites) {
        (userOptions as any).sites[site].enableUI = {
          fullscreen: LegacyExtensionMode.Default,
          theater: LegacyExtensionMode.Default,
          normal: LegacyExtensionMode.Default,
        }
      }
      userOptions.sites['@global'].enableUI = {
        fullscreen:  userOptions.ui.inPlayer.enabled ? LegacyExtensionMode.Enabled : LegacyExtensionMode.Disabled,
        theater: LegacyExtensionMode.Enabled,
        normal: (userOptions.ui.inPlayer.enabled && !userOptions.ui.inPlayer.enabledFullscreenOnly) ? LegacyExtensionMode.Enabled : LegacyExtensionMode.Disabled
      }
      userOptions.sites['@empty'].enableUI = {
        fullscreen: LegacyExtensionMode.Default,
        theater: LegacyExtensionMode.Default,
        normal: LegacyExtensionMode.Default,
      }
    }
  }, {
    forVersion: '6.2.6',
    updateFn: (userOptions: any, defaultOptions, logger?) => {
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
    updateFn: (userOptions: any) => {
      // applyToEmbeddedContent is now an enum, and also no longer optional
      for (const site in userOptions.sites) {
        if (userOptions.sites[site].applyToEmbeddedContent === undefined) {
          userOptions.sites[site].applyToEmbeddedContent = EmbeddedContentSettingsOverridePolicy.UseAsDefault;
        } else {
          userOptions.sites[site].applyToEmbeddedContent = userOptions.sites[site].applyToEmbeddedContent ? EmbeddedContentSettingsOverridePolicy.Always : EmbeddedContentSettingsOverridePolicy.Never;
        }
      }
    }
  },
  {
    forVersion: '6.3.93',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface) => {
      (userOptions as any).arDetect.polling = defaultOptions.aard.polling;
      (userOptions as any).arDetect.subtitles = defaultOptions.aard.subtitles;
      (userOptions as any).arDetect.autoDisable = defaultOptions.aard.autoDisable;
    }
  },
  {
    forVersion: '6.3.98',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface) => {
      (userOptions as any).arDetect.letterboxOrientationScan = defaultOptions.aard.letterboxOrientationScan;
      (userOptions as any).arDetect.edgeDetection = defaultOptions.aard.edgeDetection;
      (userOptions as any).arDetect.subtitles = defaultOptions.aard.subtitles;
    }
  },
  {
    forVersion: '6.3.98',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface) => {
      userOptions.aard = defaultOptions.aard;
      userOptions.aardLegacy = defaultOptions.aardLegacy;
      delete (userOptions as any).arDetect;
    }
  },
  {
    forVersion: '6.3.994',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface, logger?) => {
      const convertLegacyExtensionMode = (option: {normal: LegacyExtensionMode, theater: LegacyExtensionMode, fullscreen: LegacyExtensionMode}) => {
        if (typeof option === 'number') {
          logger.warn('updateFn', 'This option is not an object, which suggests it has already been converted. Skipping conversion. Raw value of option:', option);
          return option;
        }
        logger.log(
          'updateFn',
          `\nconverting option  ———  normal: ${LegacyExtensionMode[option.normal]}    theater: ${LegacyExtensionMode[option.normal]}    fs: ${LegacyExtensionMode[option.fullscreen]}`, '\nraw obj:', option
        );
        if (option.normal === LegacyExtensionMode.Enabled) {
          return ExtensionMode.All;
        }
        if (option.theater === LegacyExtensionMode.Enabled) {
          return ExtensionMode.Theater;
        }
        if (option.fullscreen === LegacyExtensionMode.Enabled) {
          return ExtensionMode.FullScreen;
        }
        if (option.fullscreen === LegacyExtensionMode.Disabled) {
          return ExtensionMode.Disabled;
        }
        return ExtensionMode.Default;
      }

      for (const key in userOptions.sites) {
        logger.log('updateFn', '\n\n     ... migrating default enable-state for site', key);
        userOptions.sites[key].enable = convertLegacyExtensionMode(userOptions.sites[key].enable as any);
        userOptions.sites[key].enableAard = convertLegacyExtensionMode(userOptions.sites[key].enableAard as any);
        userOptions.sites[key].enableKeyboard = convertLegacyExtensionMode(userOptions.sites[key].enableKeyboard as any);
        userOptions.sites[key].enableUI = convertLegacyExtensionMode(
          userOptions.sites[key].enableUI ?? (key === '@global' ? ExtensionMode.FullScreen : ExtensionMode.Default) as any
        );

        logger.log('updateFn', 'migrated site', key, userOptions.sites[key]);
      }
    }
  },
  {
    forVersion: '6.3.995',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface, logger?) => {
      if (!userOptions.ui) {
        userOptions.ui = defaultOptions.ui
      };
    }
  }, {
    forVersion: '6.3.996',
    updateFn: (userOptions: SettingsInterface, defaultOptions: SettingsInterface, logger?) => {
      for (const site in userOptions.sites) {
        const siteData = userOptions.sites[site];
        logger.log('updateFn', 'migrating settings for', site, '  — persistCSA?', siteData.persistCSA, 'typeof persistCSA?', typeof siteData.persistCSA, 'does domconfig exist?', siteData.DOMConfig);

        if (typeof siteData.persistCSA !== 'number') {
          userOptions.sites[site].persistCSA = CropModePersistence.Default;
        } else {
          userOptions.sites[site].persistCSA = userOptions.sites[site].persistCSA ?? CropModePersistence.Default;
        }

        if (userOptions.sites[site].type as any === 'user-added' || userOptions.sites[site].type === 'user-defined') {
          userOptions.sites[site].type = SiteSupportLevel.UserDefined;
        }
        if (userOptions.sites[site].type as any === 'no-support') {
          userOptions.sites[site].type = SiteSupportLevel.Unknown;
        }
        if (userOptions.sites[site].defaultType as any === 'user-added' || userOptions.sites[site].defaultType === 'user-defined') {
          userOptions.sites[site].type = SiteSupportLevel.UserDefined;
        }
        if (userOptions.sites[site].defaultType as any === 'no-support') {
          userOptions.sites[site].defaultType = SiteSupportLevel.Unknown;
        }

        if (siteData.activeDOMConfig?.startsWith('community') || siteData.activeDOMConfig === 'official' || siteData.activeDOMConfig === 'empty' || siteData.activeDOMConfig === 'auto') {
          siteData.activeDOMConfig = `@${siteData.activeDOMConfig}`;
        }

        for (const domConf in siteData.DOMConfig) {
          logger.log('updateFn', "Updating domconf", domConf);
          const oldConf = userOptions.sites[site].DOMConfig[domConf] as any;
          logger.log('updateFn', "——— oldConf:", oldConf);

          const newConf: any = {
            type: oldConf.type ?? userOptions.sites[site].type,
            elements: {}
          };

          if (newConf.type === 'user-added' || newConf.type === 'user-defined') {
            newConf.type = SiteSupportLevel.UserDefined;
          }
          if (newConf.type === 'no-support') {
            newConf.type = SiteSupportLevel.Unknown;
          }

          if (oldConf.elements?.player) {
            newConf.elements['player'] = {
              detectionMode: oldConf?.elements?.player?.manual ? (
                oldConf?.elements?.player?.querySelectors.trim() ? PlayerDetectionMode.QuerySelectors : PlayerDetectionMode.AncestorIndex
              ) : PlayerDetectionMode.Auto,
              allowAutoFallback: true,
              ancestorIndex: oldConf?.elements?.player?.parentIndex,
              querySelectors: oldConf?.elements?.player?.querySelectors,
            }
          } else {
            newConf.elements['player'] = {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
            }
          }
          if (oldConf.customCss) {
            newConf.customCss = oldConf.customCss;
          }

          if (oldConf.elements?.video) {
            newConf.elements['video'] = {
              type: oldConf.type ?? siteData.type,
              elements: {
                video: {
                  playerDetectionMode: oldConf?.elements?.video?.manual ? PlayerDetectionMode.QuerySelectors : PlayerDetectionMode.Auto,
                  allowAutoFallback: true,
                  querySelectors: oldConf?.elements?.video?.querySelectors,
                  customCSS: oldConf?.elements?.video?.customCss,
                }
              }
            }
          }


          // migrate names — official and community options get @ at the start
          let domConfName = domConf;
          if (domConfName.startsWith('community') || domConfName === 'official' || domConfName === 'empty' || domConfName === 'auto') {
            domConfName = `@${domConfName}`;
          }

          if (domConfName !== domConf) {
            logger.warn(`updateFn`, '\n\nnaming for default domConf has changed. Old:', domConf, 'new:', domConfName);
            delete userOptions.sites[site].DOMConfig[domConf];
          }

          userOptions.sites[site].DOMConfig[domConfName] = newConf;
        }
      }

      // set new defaults for global and empty:
      userOptions.sites['@global'].DOMConfig = {
        '@auto': {
          type: SiteSupportLevel.Unknown,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
            },
            video: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
            }
          }
        }
      }
      userOptions.sites['@global'].activeDOMConfig = '@auto';
      userOptions.sites['@empty'].DOMConfig = {
        '@empty': {
          type: SiteSupportLevel.UserDefined,
          elements: {
            player: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
            },
            video: {
              detectionMode: PlayerDetectionMode.Auto,
              allowAutoFallback: true,
            }
          },
        }
      };
      userOptions.sites['@empty'].activeDOMConfig = '@empty';

      logger.log('updateFn', 'Migration complete. New site settings:', userOptions.sites);
    }
  }

]);


export default ExtensionConfPatch;
