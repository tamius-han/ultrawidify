import Comms from '../../ext/lib/comms/Comms';

class ExecAction {
  constructor(settings, site) {
    this.settings = settings;
    this.site = site;
  }

  setSettings(settings) {
    this.settings = settings;
  }
  setSite(site) {
    this.site = site;
  }

  exec(action, scope, frame) {
    for (var cmd of action.cmd) {
      if (scope === 'page') {
        const message = {
          forwardToContentScript: true,
          targetFrame: frame,
          frame: frame,
          cmd: cmd.action,
          arg: cmd.arg,
          customArg: cmd.customArg
        }
        Comms.sendMessage(message);
      } else if (scope === 'site') {

        let site = this.site;
        if (!this.site) {
          site = window.location.host;
        }

        if (!this.settings.active.sites[site]) {
          this.settings.active.sites[site] = this.settings.getDefaultOption();
        }

        if (cmd.action === "set-stretch") {
          this.settings.active.sites[site].stretch = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.sites[site].videoAlignment = cmd.arg;
        } else if (cmd.action === "set-extension-mode") {
          this.settings.active.sites[site].mode = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.sites[site].autoar = cmd.arg;
        }
        this.settings.save();
      } else if (scope === 'global') {
        if (cmd.action === "set-stretch") {
          this.settings.active.sites['@global'].stretch = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.sites['@global'].videoAlignment = cmd.arg;
        } else if (cmd.action === "set-extension-mode") {
          this.settings.active.sites['@global'].mode = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.sites['@global'].autoar = cmd.arg;
        }
        this.settings.save();
      }
    }
  }
}

export default ExecAction;
