// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}

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
  }
];

export default ExtensionConfPatch;