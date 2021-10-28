// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}
import StretchType from '../../common/enums/StretchType.enum';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import BrowserDetect from './BrowserDetect';
import SettingsInterface from '../../common/interfaces/SettingsInterface';

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
    forVersion: '6.0.0',
    updateFn: (userOptions: SettingsInterface, defaultOptions) => {
      // migrate keyboard settings to the new format:

      // userOptions.actions
    }
  }
];


export default ExtensionConfPatch;
