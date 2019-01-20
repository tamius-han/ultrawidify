import Comms from '../../ext/lib/comms/Comms';

class ExecAction {
  constructor(settings) {
    this.settings = settings;
  }

  setSettings(settings) {
    this.settings = settings;
  }

  exec(action, scope, frame) {
    for (var cmd of action.cmd) {
      if (scope === 'page') {
        const message = {
          forwardToContentScript: true,
          targetFrame: frame,
          frame: frame,
          cmd: cmd.action,
          arg: cmd.arg
        }
        Comms.sendMessage(message);
      } else if (scope === 'site') {
        if (cmd.action === "set-stretch") {
          this.settings.active.sites[window.location.host].stretch = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.sites[window.location.host].videoAlignment = cmd.arg;
        } else if (cmd.action === "set-extension-mode") {
          this.settings.active.sites[window.location.host].status = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.sites[window.location.host].arStatus = cmd.arg;
        }
        this.settings.save();
      } else if (scope === 'global') {
        if (cmd.action === "set-stretch") {
          this.settings.active.stretch.initialMode = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.miscSettings.videoAlignment = cmd.arg;
        } else if (cmd.action === "set-extension-mode") {
          this.settings.active.extensionMode = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.arDetect.mode.arStatus = cmd.arg;
        }
        this.settings.save();
      }
    }
  }
}

export default ExecAction;
