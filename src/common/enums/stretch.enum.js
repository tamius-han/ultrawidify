var Stretch = Object.freeze({
  NoStretch: 0,
  Basic: 1,
  Hybrid: 2,
  Conditional: 3,
  Fixed: 4,
  FixedSource: 5,
  Default: -1,
  toString: (stretch) => {
    switch (stretch) {
      case 0:
        return 'NoStretch';
      case 1:
        return 'Basic';
      case 2:
        return 'Hybrid';
      case 3:
        return 'Conditional';
      case 4:
        return 'Fixed';
      case 5:
        return 'FixedSource';
      case -1:
        return 'Default';
      default:
        return 'INVALID STRETCH VALUE';
    }
  }
});

export default Stretch;
