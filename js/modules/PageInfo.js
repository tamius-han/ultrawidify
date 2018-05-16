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
    try{
    var vids = document.getElementsByTagName('video');

    if(!vids || vids.length == 0){
      this.hasVideos = false;
  
      this.scheduleRescan();
      return;
    }

    // debugger;

    // add new videos
    // for(var video of vids){
    //   var existing = this.videos.find( (x) => {
    //     if (video && x == video.video)
    //       return x;
    //     if (video && x.currentSrc == video.video.currentSrc){
    //       return x;
    //     }
    //   })
      
    //   if(existing){
    //     video.video = existing;
    //   } else {
    //     this.videos.push(
    //       new VideoData(video)
    //     );
    //   }
    // }
    if(this.videos.length > 0){
      if(vids[0] == this.videos[0].video){
      // do nothing
      } else {
        this.videos[0].destroy();
        this.videos[0] = new VideoData(vids[0]);
      }
    } else {
      this.videos.push(new VideoData(vids[0]));
    }

    console.log("Rescan complete. Total videos?", this.videos.length)
    }catch(e){
      console.log("rescan error:",e)
    }
    this.scheduleRescan();
  }

  scheduleRescan(){
    try{
    if(this.rescanTimer){
      clearTimeout(this.rescanTimer);
    }

    var ths = this;
    
    
    this.rescanTimer = setTimeout(function(){
      ths.rescanTimer = null;
      ths.rescan();
      ths = null;
    }, 1000)
  }catch(e){console.log("eee",e)}
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
