var CropModePersistence = Object.freeze({
  Default: -1,
  Disabled: 0,
  UntilPageReload: 1,
  CurrentSession: 2,
  Forever: 3,

  toString: (cropModePersistence) => {
    switch (cropModePersistence) {
      case -1:
        return 'default';
      case 0:
        return 'disabled';
      case 1:
        return 'until page reload';
      case 2:
        return 'current session';
      case 3:
        return 'forever';
      default:
        return 'unknown mode';
    }
  }
});

export default CropModePersistence;