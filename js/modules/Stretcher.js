// računa vrednosti za transform-scale (x, y)
// transform: scale(x,y) se uporablja za raztegovanje videa, ne pa za približevanje
// calculates values for transform scale(x, y)
// transform: scale(x,y) is used for stretching, not zooming. 


class Stretcher {
  // internal variables


  // functions
  constructor(videoData) {
    this.conf = videoData;
    this.mode = ExtensionConf.stretch.initialMode;
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

  calculateBasicStretch() {
    // video.videoWidth in video.videoHeight predstavljata velikost datoteke. 
    // velikost video datoteke je lahko drugačna kot velikost <video> elementa. 
    // Zaradi tega lahko pride do te situacije:
    //     * Ločljivost videa je 850x480 (videoWidth & videoHeight)
    //     * Velikost <video> značke je 1920x720. 
    // Znotraj te video značke bo video prikazan v 1280x720 pravokotniku. Raztegovanje
    // torej hočemo računati z uporabo vrednosti 1280 in 720. Teh vrednosti pa ne
    // poznamo. Torej jih moramo računati.
    //
    //
    // video.videoWidht and video.videoHeight describe the size of the video file.
    // Size of the video file can be different than the size of the <video> tag.
    // This can leave us with the following situation:
    //     * Video resolution is 850x480-ish (as reported by videoWidth and videoHeight)
    //     * Size of the <video> tag is 1920x720
    // The video will be displayed in a 1280x720 rectangle inside that <video> tag. 
    // This means we want to calculate stretching using those values, but we don't know
    // them. This means we have to calculate them.

    const videoAr = this.conf.video.videoWidth / this.conf.video.videoHeight;
    if (this.conf.player.dimensions.width > this.conf.player.dimensions.height * videoAr) {
      return {
        xFactor: this.conf.player.dimensions.width / (this.conf.player.dimensions.height * videoAr),
        yFactor: 1
      };
    }

    return {
      xFactor: 1,
      yFactor: this.conf.player.dimensions.height / (this.conf.player.dimensions.width / videoAr)
    };
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

    return stretchFactors;
  }
}