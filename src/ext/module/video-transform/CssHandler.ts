import Debug from '../../conf/Debug';

class CssHandler {
  static buildStyleArray(existingStyleString, extraStyleString) {
    if (existingStyleString) {
      const styleArray = existingStyleString.split(";");

      if (extraStyleString) {
        const extraCss = extraStyleString.split(';');
        let dup = false;

        for (const ecss of extraCss) {
          for (let i in styleArray) {
            if (ecss.split(':')[0].trim() === styleArray[i].split(':')[0].trim()) {
              dup = true;
              styleArray[i] = ecss;
            }
            if (dup) {
              dup = false;
              continue;
            }
            styleArray.push(ecss);
          }
        }
      }
  
      for (let i in styleArray) {
        styleArray[i] = styleArray[i].trim();   
        // some sites do 'top: 50%; left: 50%; transform: <transform>' to center videos. 
        // we dont wanna, because we already center videos on our own
        if (styleArray[i].startsWith("transform:") ||
            styleArray[i].startsWith("top:") ||
            styleArray[i].startsWith("left:") ||
            styleArray[i].startsWith("right:") ||
            styleArray[i].startsWith("bottom:") ){
          delete styleArray[i];
        }
      }
      return styleArray;
    }

    return [];
  }

  static buildStyleString(styleArray) {
    let styleString = '';

    for(let i in styleArray) {
      if(styleArray[i]) {
        styleString += styleArray[i] + "; ";
      }
    }

    return styleString;
  }
}

export default CssHandler;