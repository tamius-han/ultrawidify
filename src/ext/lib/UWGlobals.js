export default class UWGlobals {

  constructor() {
    this.videos = [];
    this.busSubscriptions = [];
    this.actionSubscriptions = {};
    this.bus = {
      sendMessage: (action, config) => this.propagateMessages(action, config),
      subscribe: this.subscribeToAny,
      subscribeToAction: this.subscribeToAction
    }
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

  importSubscriptionsFromCommsHandlers(commands) {
    for (const action in commands) {
      for (const command of commands[action]) {
        this.subscribeToAction(action, command);
      }
    }
  }

  subscribeToAction(action, callback) {
    if (!this.actionSubscriptions[action]) {
      this.actionSubscriptions[action] = [];
    }

    this.actionSubscriptions[action].push(callback);
  }

  subscribeToAny(callback) {
    this.busSubscriptions.push(callback);
  }

  propagateMessages(action, config) {
    if (this.busSubscriptions) {
      for (const subscription of this.busSubscriptions) {
        subscription(action, config);
      }
    }
    if (this.actionSubscriptions && this.actionSubscriptions[action]) {
      for (const subscription of this.actionSubscriptions[action]) {
        subscription(config);
      }
    }
  }

  destroy() {
    // todo: implement
  }
}
