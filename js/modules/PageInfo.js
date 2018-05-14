if(Debug.debug)
  console.log("Loading: PageInfo.js");

class PageInfo {
  constructor(){
    this.hasVideos = false;
    this.siteDisabled = false;
    this.videos = [];


    this.rescan();
  }

  rescan(count){
    var vids = document.getElementsByTagName('video');

    if(!vids || vids.length == 0){
      this.hasVideos = false;
      return;
    }

    // debugger;

    // add new videos
    for(var video of vids){
      var existing = this.videos.find( (x) => {
        if (x == video.video)
          return x;
        if (x.currentSrc == video.video.currentSrc){
          return x;
        }
      })
      
      if(existing){
        video.video = existing;
      } else {
        this.videos.push(
          new VideoData(video)
        );
      }
    }
  }

  initArDetection(){
    for(var vd in this.videos){
      vd.initArDetection();
    }
  }

  setAr(ar){
    // TODO: find a way to only change aspect ratio for one video
    for(var vd in this.videos){
      vd.setAr(ar)
    }
  }
  
  setStretchMode(sm){
    for(var vd in this.videos){
      vd.setStretchMode(ar)
    }
  }

}
