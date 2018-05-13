if(Debug.debug)
  console.log("Loading: PageInfo.js");

class PageInfo {
  constructor(){
    this.hasVideos = false;
    this.siteDisabled = false;
    this.videos = [];
  }


  rescan(){
    var videos = document.getElementsByTagName('video');

    if(!videos || videos.length == 0){
      this.hasVideos = false;
      return;
    }

    // add new videos
    for(video of videos){
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
        videos.push(
          new VideoData(video)
        );
      }
    }
  }

}

var _pi_hasVideos = function(){
//   return true;
  var videos = document.getElementsByTagName("video");
  if(videos.length == 0)
    return false;
  
//   if(videos[0].style.display == "none") // in this case ultrawidify doesn't even work
//     return false;