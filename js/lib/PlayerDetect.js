if(Debug.debug)
  console.log("Loading: FullScreenDetect.js");

var _pd_isFullScreen = function(){
  return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
}


/* sprejme <video> tag (element
// vrne dimenzije predvajalnika (širina, višina)
// 
// Na youtube v theater mode je razširitev rahlo pokvarjena. Video tag ostane večji od predvajalnika, ko se zapusti
// celozaslonski način. Ta funkcija skuša to težavo rešiti tako, da poišče element predvajalnika, ki je zavit okoli videa.
// 
// Funkcija izkorišča lastnost, da bi načeloma moral biti vsak zunanji element večji od notranjega. Najmanjši element od
// <video> značke pa do korena drevesa bi tako moral biti predvajalnik.
// 
// 
// | EN |
//
// accepts <video> tag (element)
// returns player dimensions (width, height)
//
// Theater mode is mildly broken on youtube. <video> tag remains bigger than the player after leaving the fullscreen mode, and
// there's nothing we can do about that. This function aims to solve the problem by finding the player element that's wrapped around
// the <video> tag.
// 
// In general, an outer tag should be bigger than the inner tag. Therefore the smallest element between <video> tag and the document
// root should be the player.
*/




var _pd_getPlayerDimensions = function(element){
  
  
  if(element == null || element == undefined){
    if(Debug.debug)
      console.log("[PlayerDetect::_pd_getPlayerDimensions] element is not valid, doing nothing.", element)
    
    return;
  }
  
  
  var trustCandidateAfterGrows = 2; // if candidate_width or candidate_height increases in either dimensions this many
                                    // times, we say we found our player. (This number ignores weird elements)
  // in case our <video> is bigger than player in one dimension but smaller in the other
  // if site is coded properly, player can't be wider than that
  var candidate_width = Math.max(element.offsetWidth, window.innerWidth);
  var candidate_height = Math.max(element.offsetHeight, window.innerHeight);
  var playerCandidateNode = element;
  
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
      
      playerCandidateNode = element;
      candidate_width = element.offsetWidth;
      candidate_height = element.offsetHeight;
    
    
      grows = trustCandidateAfterGrows;
    
      if(Debug.debug){
        console.log("Found new candidate for player. Dimensions: w:", candidate_width, "h:",candidate_height, "node:", playerCandidateNode);
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
  var dims = {
    width: candidate_width,
    height: candidate_height,
    element: playerCandidateNode
  };
  
  return dims;
}


// returns 'true' if there was a change.
var _pd_checkPlayerSizeChange = function(){
  if(GlobalVars.playerDimensions.element == undefined)
    return true;
  
  if(GlobalVars.playerDimensions.width != GlobalVars.playerDimensions.element.offsetWidth || GlobalVars.playerDimensions.height != GlobalVars.playerDimensions.element.offsetHeight ){
    return true;
  }
  
  return false;
}


var PlayerDetect = {
  getPlayerDimensions: _pd_getPlayerDimensions,
  checkPlayerSizeChange: _pd_checkPlayerSizeChange,
  isFullScreen: _pd_isFullScreen
}
