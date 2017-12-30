if(Debug.debug)
  console.log("Loading: PageInfo.js");

var _pi_hasVideos = function(){
  var videos = document.getElementsByTagName("video");
  if(videos.length == 0)
    return false;
  
  if(videos[0].style.display == "none") // in this case ultrawidify doesn't even work
    return false;
  
  
  return true;
}

var PageInfo = {
  hasVideos: _pi_hasVideos
}
