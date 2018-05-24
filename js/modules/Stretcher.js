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

  applyConditionalStretch(stretchFactors, actualAr){
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

  calculateStretch(actualAr) {
    // naj ponovim: samo razširjamo, nikoli krčimo
    // let me reiterate: only stretch, no shrink

    var playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    var videoAr = this.conf.video.videoWidth / this.conf.video.videoHeight;

    if (! actualAr){
      actualAr = playerAr;
    }

    var stretchFactors = {
      xFactor: 1,
      yFactor: 1
    };

    if (actualAr > videoAr) {
      if(videoAr > playerAr) {
        stretchFactors.xFactor = playerAr / videoAr;
        stretchFactors.yFactor = actualAr / videoAr;
      } else {
        stretchFactors.xFactor = 1;
        stretchFactors.yFactor = actualAr / videoAr;
      }
    } else {
      if (videoAr > playerAr) {
        stretchFactors.xFactor = videoAr / actualAr;
        stretchFactors.yFactor = playerAr / actualAr;
      } else {
        stretchFactors.xFactor = playerAr / actualAr;
        stretchFactors.yFactor = 1;
      }
    }
    return stretchFactors;
  }
}