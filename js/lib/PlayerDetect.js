if(Debug.debug)
  console.log("Loading: FullScreenDetect.js");

var _pd_isFullScreen = function(){
  return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
}


/* sprejme <video> tag (element) in seznam imen, ki se lahko pojavijo v razredih oz. id staršev.
// vrne dimenzije predvajalnika (širina, višina)
// 
// Na youtube v theater mode je razširitev rahlo pokvarjena. Video tag ostane večji od predvajalnika, ko se zapusti
// celozaslonski način. Ta funkcija skuša to težavo rešiti tako, da poišče element predvajalnika, ki je zavit okoli videa.
// 
// Funkcija izkorišča lastnost, da bi načeloma moral biti vsak zunanji element večji od notranjega. Najmanjši element od
// <video> značke pa do korena drevesa bi tako moral biti predvajalnik.
// 
// Če je podan seznam imen, potem funkcija vrne dimenzije prvega elementa, ki v id oz. razredu vsebuje katerokoli ime iz seznama
// 
// | EN |
//
// accepts <video> tag (element) and list of names that can appear in id or class 
// returns player dimensions (width, height)
//
// Theater mode is mildly broken on youtube. <video> tag remains bigger than the player after leaving the fullscreen mode, and
// there's nothing we can do about that. This function aims to solve the problem by finding the player element that's wrapped around
// the <video> tag.
// 
// In general, an outer tag should be bigger than the inner tag. Therefore the smallest element between <video> tag and the document
// root should be the player.
//
// If list of names is provided, the function returns dimensions of the first element that contains any name from the list in either
// id or class.
*/




var _pd_getPlayerDimensions = function(startElement, elementNames){
  var element = startElement;
  
  if(element == null || element == undefined){
    if(Debug.debug)
      console.log("[PlayerDetect::_pd_getPlayerDimensions] element is not valid, doing nothing.", element)
    
    return;
  }
  
  var isFullScreen = _pd_isFullScreen();
  
  var trustCandidateAfterGrows = 2; // if candidate_width or candidate_height increases in either dimensions this many
                                    // times, we say we found our player. (This number ignores weird elements)
  // in case our <video> is bigger than player in one dimension but smaller in the other
  // if site is coded properly, player can't be wider than that
  var candidate_width = Math.max(element.offsetWidth, window.innerWidth);
  var candidate_height = Math.max(element.offsetHeight, window.innerHeight);
  var playerCandidateNode = startElement;
  
  // <video> can't be root in a document, so we can do this
  element = element.parentNode;
  
  try{
  var grows = trustCandidateAfterGrows;
  while(element != undefined){    
    // odstranimo čudne elemente, ti bi pokvarili zadeve
    // remove weird elements, those would break our stuff
    if ( element.offsetWidth == 0 || element.offsetHeight == 0){
      element = element.parentNode;
      continue;
    }

    if ( element.offsetHeight <= candidate_height &&
         element.offsetWidth  <= candidate_width  ){
      
      // if we're in fullscreen, we only consider elements that are exactly as big as the monitor.
      if( ! isFullScreen || 
          (element.offsetWidth == window.innerWidth && element.offsetHeight == window.innerHeight) ){
      
        playerCandidateNode = element;
        candidate_width = element.offsetWidth;
        candidate_height = element.offsetHeight;
      
        grows = trustCandidateAfterGrows;
      
        if(Debug.debug){
          console.log("Found new candidate for player. Dimensions: w:", candidate_width, "h:",candidate_height, "node:", playerCandidateNode);
        }
      }
    }
    else if(grows --<= 0){
      
      if(Debug.debug && Debug.playerDetect){
        console.log("Current element grew in comparrison to the child. We probably found the player. breaking loop, returning current result");
      }
      break;
    }
    
    element = element.parentNode;
  }
  }
  catch(e){
    console.log("pdeeee,",e);
  }
  var dims;
  
  if(isFullScreen && playerCandidateNode == startElement){
    dims = {
      width: window.innerWidth,
      height: window.innerHeight,
      element: null,
      fullscreen: true
    }
  }
  else{
    dims = {
      width: candidate_width,
      height: candidate_height,
      element: playerCandidateNode,
      fullscreen: isFullScreen
    };
  }
  
  return dims;
}


// returns 'true' if there was a change.
var _pd_checkPlayerSizeChange = function(){
  
  console.log("Player:", GlobalVars.playerDimensions, "Node:", GlobalVars.playerDimensions.element)

  if(Debug.debug){
    if(GlobalVars.playerDimensions.element == undefined)
      console.log("[PlayerDetect] player size changed. reason: player element undefined");
    
    if(GlobalVars.playerDimensions.fullscreen){
      if(! _pd_isFullScreen()){
        console.log("[PlayerDetect] player size changed. reason: exited fullscreen");
      }
    }
    
    if(GlobalVars.playerDimensions.width != GlobalVars.playerDimensions.element.offsetWidth || GlobalVars.playerDimensions.height != GlobalVars.playerDimensions.element.offsetHeight ){
      console.log("[PlayerDetect] player size changed. reason: dimension change");
    }
  }
  
  if(GlobalVars.playerDimensions.element == undefined)
    return true;
  
  
  
  if(GlobalVars.playerDimensions.width != GlobalVars.playerDimensions.element.offsetWidth || GlobalVars.playerDimensions.height != GlobalVars.playerDimensions.element.offsetHeight ){
    return true;
  }
  
  // if(GlobalVars.playerDimensions.fullscreen){
  //   return ! _pd_isFullScreen();
  // }

  return false;
}


var PlayerDetect = {
  getPlayerDimensions: _pd_getPlayerDimensions,
  checkPlayerSizeChange: _pd_checkPlayerSizeChange,
  isFullScreen: _pd_isFullScreen
}
