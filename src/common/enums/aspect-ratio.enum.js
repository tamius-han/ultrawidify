var AspectRatio = Object.freeze({
  Initial: -1,    // page default
  Reset: 0,       // reset to initial
  Automatic: 1,   // set by Aard
  FitWidth: 2,    // legacy/dynamic: fit to width
  FitHeight: 3,   // legacy/dynamic: fit to height
  Fixed: 4,       // pre-determined aspect ratio
  Manual: 5,      // ratio achieved by zooming in/zooming out

  toString: (ar) => {
    switch (ar) {
      case -1: return 'Initial';
      case 0:  return 'Reset';
      case 1:  return 'Automatic';
      case 2:  return 'FitWidth';
      case 3:  return 'FitHeight';
      case 4:  return 'Fixed';
      case 5:  return 'Manual';
      default: return '<not an valid enum value>'
    }
  }
});

export default AspectRatio;
