// How to use:
// version: {ExtensionConf object, but only properties that get overwritten}

const ExtensionConfPatch = {
  '4.2.0': {
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
  },
}

export default ExtensionConfPatch;