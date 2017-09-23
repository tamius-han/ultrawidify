 var debugmsg = true;
 var debugmsg_click = false;
 var debugmsg_message = false;
 var debugmsg_autoar = false;
 var debugmsg_periodic = false;
 var debugmsg_ui = true;
 var force_conf_reload = true;
 if(debugmsg || debugmsg_click || debugmsg_message || debugmsg_autoar){
   console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
   console.log("\nLoading ultrawidify (uw)\nIf you can see this, extension at least tried to load\n\nRandom number: ",Math.floor(Math.random() * 20) + 1,"\n");
   
   if(debugmsg)
     console.log("Logging all");
   
   if(debugmsg_click)
     console.log("Logging debugmsg_click");
   
   if(debugmsg_message)
     console.log("Logging debugmsg_message");
   
   if(debugmsg_autoar)
     console.log("Logging autoar");
   
   console.log(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ");
 }
