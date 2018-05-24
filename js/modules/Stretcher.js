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
    var playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    var videoAr = this.conf.video.videoWidth / this.conf.video.videoHeight;

    if (! actualAr){
      actualAr = playerAr;
    }

    var newWidth = this.conf.video.offsetWidth * stretchFactors.xFactor;
    var newHeight = this.conf.video.offsetHeight * stretchFactors.yFactor;

    var actualWidth, actualHeight;

    // determine the dimensions of the video (sans black bars) after scaling
    if(actualAr < videoAr){
      actualHeight = newHeight;
      actualWidth = newHeight * actualAr;
    } else {
      actualHeight = newWidth / actualAr;
      actualWidth = newWidth;
    }

    var minW = this.conf.player.dimensions.width * (1 - ExtensionConf.stretch.conditionalDifferencePercent);
    var maxW = this.conf.player.dimensions.width * (1 + ExtensionConf.stretch.conditionalDifferencePercent);

    var minX = this.conf.player.dimensions.height * (1 - ExtensionConf.stretch.conditionalDifferencePercent);
    var maxX = this.conf.player.dimensions.height * (1 + ExtensionConf.stretch.conditionalDifferencePercent);

    if (actualWidth >= minW && actualWidth <= maxW) {
      stretchFactors.xFactor *= this.conf.player.dimensions.width / actualWidth;
    }
    if (actualHeight >= minH && actualHeight <= maxH) {
      stretchFactors.yFactor *= this.conf.player.dimensions.height / actualHeight;
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