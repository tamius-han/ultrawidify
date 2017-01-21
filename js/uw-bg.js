var browser_autodetect = true;
var usebrowser = "chrome";

debugmsg = true;
debugmsg_imdb = false;
url_changed = false;
if(debugmsg){
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
  console.log("\nLoading ultrawidify background script (uw-bg)\nIf you can see this, extension at least tried to load\n\nRandom number: ",Math.floor(Math.random() * 20) + 1,"\n");
  console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
}

if(browser_autodetect){
  if(!browser){ // This means we're probably not on Firefox.
    if(chrome){
      browser = chrome;
      usebrowser = "chrome";
    }
  }
  else
    usebrowser = "firefox";
}
else{
  if(usebrowser == "chrome")
    browser = chrome;
}




/********************************************
 ****  script-related stuff starts here  ****
 ********************************************/

function gibActiveTab(){
  return browser.tabs.query({active: true, currentWindow: true});
}

var page_change_msg_count = 0;

function notifyChange(){
  
  if(debugmsg)
    console.log("uw-bg::tab updated. seq:", page_change_msg_count++);
  
  browser.tabs.query({active: true, currentWindow: true}, function(tabs){
    browser.tabs.sendMessage(tabs[0].id, {message: "page-change"});
  });
}

browser.tabs.onUpdated.addListener(notifyChange);

//BEGIN Goldberg machine that gets aspect ratio data off imdb

function getAspectRatio(title, sender_tab){
  // presledki morajo biti zamenjani s +
  // spaces need to be replaced with +
  var rektitle = title.replace(/ /g, '+');
  
  // Zdaj lahko pošljemo zahtevek na omdbapi
  // now we can send a request to omdbapi
  httpGET("http://www.omdbapi.com/?t=" + rektitle,
          function(response, sender_tab) {
            if(debugmsg || debugmsg_imdb)
              console.log("uw-bg::getAspectRatio | omdbapi gave us this: ", response);
            
            var info = JSON.parse(response);
            
            if(!info || !info.Title)
              return;
            
            if(debugmsg || debugmsg_imdb){
              console.log("uw-bg::getAspectRatio | movie title: »»", info.Title, "«« | imdb ID:", info.imdbID,"\nTrying to get technical specs off IMDB");
            }
            httpGET("https://www.imdb.com/title/" + info.imdbID + "/technical",
                    function(response, sender_tab){
                      if(!response)
                        return;
                      var lines = response.split('\n');
                      if(debugmsg || debugmsg_imdb){
                        console.log("uw-bg::getAspectRatio | we just got something off IMDB, it's",lines.length,"long. Here's what we got:\n",response);
                      }
                      
                      // IMDB nam zraven da veliko nepotrebnega sranja. Na testni strani je bil relevanten podatek
                      // 700+ (!) vrstic globoko. Stvar, ki nam jo da IMDB ima 1500+ vrstic. Iskanje bomo zato začeli
                      // od sredine
                      // 
                      // IMDB gives us a lot of unnecessary shit along with the data we want. On our test page the 
                      // relevant data was buried 700+ lines deep (1500+ lines total). Because we don't want to 
                      // pointlessly search half the page, the best place to start seems to be the middle.
                      
                      var lines_nr = lines.length;
                      if(lines_nr % 2 == 1)
                        ++lines_nr;
                      var i = lines_nr / 2;
                      var j = i;
                      var ar_found = 0;
                      
                      while(i > 400 && j < lines_nr){
                        
                        if(lines[i].indexOf("Aspect Ratio") != -1){
                          if(debugmsg || debugmsg_imdb)
                            console.log("uw-bg::getAspectRatio | »Aspect Ratio« has been found on line",i," — searching for aspect ratio ...");
                          
                          ar_found = i;
                          break;
                        }
                        if(lines[j].indexOf("Aspect Ratio") != -1){
                          if(debugmsg || debugmsg_imdb)
                            console.log("uw-bg::getAspectRatio | »Aspect Ratio« has been found on line",j," — searching for aspect ratio ...");
                          
                          ar_found = j;
                          break;
                        }
                        --i;
                        ++j;
                      }
                      
                      
                      if(ar_found){
                        var ar_limit = ar_found + 5;
                        for(var i = ar_found; i < ar_limit; ++i){
                          if(debugmsg || debugmsg_imdb)
                            console.log("uw-bg::getAspectRatio | scanning lines for aspect ratio number. Line:",lines[i],"has ar:", lines[i].indexOf(":"));
                          if(lines[i].indexOf(":") != -1){
                            // To pomeni, da smo našli razmerje stranic. gg ez
                            // This means we found our aspect ratio, gg ez
                            
                            var ar = lines[i].trim().split(":");
                            ar[0] = ar[0].trim();
                            ar[1] = ar[1].trim();
                            
                            if(debugmsg || debugmsg_imdb)
                              console.log("uw-bg::getAspectRatio | Aspect ratio found:",ar[0],":",ar[1]);
                            
                            // Pa povejmo to naši strani:
                            // Let's break the news:
                            browser.tabs.sendMessage(sender_tab.id, {type:"arInfo", arx:ar[0], ary:ar[1]});
                          }
                        }
                      }
                      else
                        if(debugmsg || debugmsg_imdb)
                          console.log("uw-bg::getAspectRatio | Aspect ratio hasn't been found");
                      
                    },
                    sender_tab
            ); //httpGET end
          },
          sender_tab
  ); //httpGET end
}

function httpGET(url, callback, callback_args){
  var rek = new XMLHttpRequest();
  rek.onreadystatechange = function(){
    if(rek.readyState == 4 && rek.status == 200){
      callback(rek.responseText, callback_args);
    }
  }
  rek.open("GET", url, true);
  rek.send(null);
}
//END 3rd party snooping for aspect ratios
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {  
  
  //Stvari delamo samo, če ima naše sporočilce tip
  //We only do stuff if our message has a type
  if(request.type){
    if(request.type == "debug"){
      console.log("uw-bg::onMessage | got a message. It was a debugging message. Here's the full message:",request);
    }
    if(request.type == "gibAspectRatio"){
      if(debugmsg || debugmsg_imdb)
        console.log("uw-bg::onMessage | got a message, we want to set aspect ratio. message:",request,"sender:",sender);
      var result = getAspectRatio(request.title, sender.tab);
    }
  }
});


