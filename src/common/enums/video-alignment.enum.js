var VideoAlignment = Object.freeze({
  Left: 0,
  Center: 1,
  Right: 2,
  Default: -1,
  toString: (alignment) => {
    switch (alignment) {
      case 0:
        return 'Left';
      case 1:
        return 'Center';
      case 2:
        return 'Right';
      case -1:
        return 'Default';
      default:
        return 'ILLEGAL VIDEO ALIGNMENT';
    }
  }
});

export default VideoAlignment;
