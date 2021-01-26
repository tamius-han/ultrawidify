export default class UWGlobals {
  constructor() {
    this.videos = [];
  }

  getNewVideoID() {
    let random;

    while (true) {
                // 4-digit [a-z0-9] string. Should be unique per page on first try
      random = (Math.random() * 1679616).toFixed().toString(36);
      
      if (this.videos.findIndex(x => x.vdid === random) === -1) {
        return random;
      }
    }
  }

  addVideo(video) {
    // get video ID
    const id = this.getNewVideoID();
    video.vdid = id;
    this.videos.push(video);
  }

  getVideo(id) {
    return this.videos.find(x => x.vdid === id);
  }

  destroy() {
    // todo: implement
  }
}
