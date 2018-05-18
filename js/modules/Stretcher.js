// računa vrednosti za transform-scale (x, y)
// transform: scale(x,y) se uporablja za raztegovanje videa, ne pa za približevanje
// calculates values for transform scale(x, y)
// transform: scale(x,y) is used for stretching, not zooming. 


class Stretcher {
  // internal variables


  // functions
  constructor(videoData) {
    this.conf = videoData;
  }

  static conditionalStretch(videoDimensions, maxDifferencePercent){
    // samo razširjamo, nikoli krčimo
    // only stretch, no shrink

    var x, y;

    x = videoDimensions.width / videoDimensions.actualWidth;
    y = videoDimensions.height / videoDimensions.actualHeight;

    var dmax = 1 + maxDifferencePercent;

    if(x < 1 || x > dmax){
      x = 1;
    }
    if(y < 1 || y > dmax){
      y = 1;
    }

    return {
      x: x,
      y: y
    }
  }

  static calculateStretch(videoDimensions) {
    // naj ponovim: samo razširjamo, nikoli krčimo
    // let me reiterate: only stretch, no shrink

    var stretch = {x: 1, y: 1};

    if (videoDimensions.actualWidth < videoDimensions.width) {
      stretch.x = videoDimensions.width / videoDimensions.actualWidth;
    }
    if (videoDimensions.actualHeight < videoDimensions.height){
      stretch.y = videoDimensions.height / videoDimensions.actualHeight;
    }

    return stretch;
  }
}