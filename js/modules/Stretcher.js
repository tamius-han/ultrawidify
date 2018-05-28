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

    var minH = this.conf.player.dimensions.height * (1 - ExtensionConf.stretch.conditionalDifferencePercent);
    var maxH = this.conf.player.dimensions.height * (1 + ExtensionConf.stretch.conditionalDifferencePercent);

    if (actualWidth >= minW && actualWidth <= maxW) {
      stretchFactors.xFactor *= this.conf.player.dimensions.width / actualWidth;
    }
    if (actualHeight >= minH && actualHeight <= maxH) {
      stretchFactors.yFactor *= this.conf.player.dimensions.height / actualHeight;
    }
  }

  calculateStretch(actualAr) {
    var playerAr = this.conf.player.dimensions.width / this.conf.player.dimensions.height;
    var videoAr = this.conf.video.videoWidth / this.conf.video.videoHeight;

    if (! actualAr){
      actualAr = playerAr;
    }

    var stretchFactors = {
      xFactor: 1,
      yFactor: 1
    };

    if(playerAr >= videoAr){
      // player adds PILLARBOX

      if(actualAr >= playerAr){
        // VERIFIED WORKS

        // actual > player > video  — video is letterboxed
        // solution: horizontal stretch according to difference between video and player AR
        //           vertical stretch according to difference between actual AR and player AR
        stretchFactors.xFactor = playerAr / videoAr;
        stretchFactors.yFactor = actualAr / videoAr;

        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 1")
        }
      } else if ( actualAr >= videoAr) {
        // VERIFIED WORKS

        // player > actual > video — video is still letterboxed
        // we need vertical stretch to remove black bars in video
        // we need horizontal stretch to make video fit width
        stretchFactors.xFactor = playerAr / videoAr;
        stretchFactors.yFactor = actualAr / videoAr;

        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 2")
        }
      } else {
        // NEEDS CHECKING
        // player > video > actual — double pillarbox
        stretchFactors.xFactor = actualAr /  playerAr;
        stretchFactors.yFactor = 1;
        
        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 3")
        }
      }
    } else {
      // player adds LETTERBOX

      if (actualAr < playerAr) {
        // NEEDS CHECKING

        // video > player > actual
        // video is PILLARBOXED
        stretchFactors.xFactor = actualAr / playerAr;
        stretchFactors.yFactor = videoAr / playerAr;

        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 4")
        }
      } else if ( actualAr < videoAr ) {
        // NEEDS CHECKING 

        // video > actual > player
        // video is letterboxed by player
        // actual is pillarboxed by video
        stretchFactors.xFactor =  actualAr / playerAr;
        stretchFActors.yFactor = actualAr / playerAr;

        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 5")
        }
      } else {
        // VERIFIED CORRECT

        // actual > video > player
        // actual fits width. Letterboxed by both.
        stretchFactors.xFactor = 1;
        stretchFactors.yFactor = actualAr / playerAr;

        if(Debug.debug){
          console.log("[Stretcher.js::calculateStretch] stretching strategy 6")
        }
      }
    }

    // if (actualAr > videoAr) {
    //   if(videoAr > playerAr) {
    //     // actual ar > video ar > player ar
    //     // stretch to fit player

    //     // stretchFactors.xFactor = playerAr / videoAr; // is this 1 then?
    //     stretchFactors.xFactor = 1;
    //     stretchFactors.yFactor = actualAr / playerAr;
    //   } else {
    //     // actual ar > player ar > video ar
    //     if(Debug.debug){
    //       console.log("[Stretcher.js::calculateStretch] stretching strategy 2")
    //     }
    //     stretchFactors.xFactor = 1; //playerAr / videoAr;
    //     stretchFactors.yFactor = actualAr / videoAr;
    //   }
    // } else {
    //   if (videoAr > playerAr) {
    //     if(Debug.debug){
    //       console.log("[Stretcher.js::calculateStretch] stretching strategy 3")
    //     }
    //     stretchFactors.xFactor = videoAr / actualAr;
    //     stretchFactors.yFactor = playerAr / actualAr;
    //   } else {
    //     if(Debug.debug){
    //       console.log("[Stretcher.js::calculateStretch] stretching strategy 4")
    //     }
    //     stretchFactors.xFactor = playerAr / actualAr;
    //     stretchFactors.yFactor = 1;
    //   }
    // }
    return stretchFactors;
  }
}