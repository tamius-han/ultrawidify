if(Debug.debug)
  console.log("Loading: FullScreenDetect.js");

var _fsd_isFullScreen = function(){
  return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
}

var FullScreenDetect = {
  isFullScreen: _fsd_isFullScreen,
  inFullScreen: _fsd_isFullScreen
}
