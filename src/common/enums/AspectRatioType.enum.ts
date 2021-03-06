enum AspectRatioType {
  Initial = -1,    // page default
  Reset = 0,       // reset to initial
  Automatic = 1,   // set by Aard
  FitWidth = 2,    // legacy/dynamic = fit to width
  FitHeight = 3,   // legacy/dynamic = fit to height
  Fixed = 4,       // pre-determined aspect ratio
  Manual = 5,      // ratio achieved by zooming in/zooming out
}

export default AspectRatioType;
