import BrowserDetect from '../../conf/BrowserDetect';

function url(file) {
  return BrowserDetect.getURL(file);
}

export default class FontLoader {
  static loadFonts() {
    const fontsStyleElement = document.createElement('style');
    fontsStyleElement.type = 'text/css';

    fontsStyleElement.textContent = `
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-thin.woff2')} format('woff2'); /* Super Modern Browsers */
           font-weight: 200;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-thin-italic.woff2')} format('woff2');
           font-weight: 200;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-extralight.woff2')} format('woff2');
           font-weight: 300;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-extralight-italic.woff2')} format('woff2');
           font-weight: 300;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-light.woff2')} format('woff2');
           font-weight: 400;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-light-italic.woff2')} format('woff2');
           font-weight: 400;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-regular.woff2')} format('woff2');
           font-weight: 500;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-italic.woff2')} format('woff2');
           font-weight: 500;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-semibold.woff2')} format('woff2');
           font-weight: 600;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-semibold-italic.woff2')} format('woff2');
           font-weight: 600;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-bold.woff2')} format('woff2');
           font-weight: 700;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass';
      src: ${url('res/fonts/overpass-webfont/overpass-bold-italic.woff2')} format('woff2');
           font-weight: 700;
           font-style: italic;
    }
    
    @font-face {
      font-family: 'Overpass mono';
      src: ${url('res/fonts/overpass-mono-webfont/overpass-mono-light.woff2')} format('woff2');
           font-weight: 300;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass mono';
      src: ${url('res/fonts/overpass-mono-webfont/overpass-mono-regular.woff2')} format('woff2');
           font-weight: 400;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass mono';
      src: ${url('res/fonts/overpass-mono-webfont/overpass-mono-semibold.woff2')} format('woff2');
           font-weight: 500;
           font-style: normal;
    }
    
    @font-face {
      font-family: 'Overpass mono';
      src: ${url('res/fonts/overpass-mono-webfont/overpass-mono-bold.woff2')} format('woff2');
           font-weight: 600;
           font-style: normal;
    }
    `;

    document.head.appendChild(fontsStyleElement);
    console.log("font loaded!")
  }
}
