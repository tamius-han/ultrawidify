let Notifications = Object.freeze({
  'TEST_NOTIFICATION': {
    icon: 'card-text',
    text: 'This is a test notification.',
    timeout: -1,
  },
  'AARD_DRM': {
    icon: 'exclamation-triangle',
    text: '<b>Autodetection may not be able to run on this video.</b> On sites that utilize DRM you will have to set aspect ratio manually.',
    timeout: 5000,
  }
});

export default Notifications;