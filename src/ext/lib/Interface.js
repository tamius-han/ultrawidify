class Interface {
  constructor(videoData) {
    this.conf = videoData;
    this.player = videoData.player;
  }

  injectUi() {
    
    this.detectorDiv = document.createElement('div');
    this.uiRoot = document.createElement('div');
    this.detectorDiv.appendChild(this.uiRoot);

    

  }
}
