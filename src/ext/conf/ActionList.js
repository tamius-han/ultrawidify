import VideoAlignment from '../../common/enums/video-alignment.enum';
import Stretch from '../../common/enums/stretch.enum';
import ExtensionMode from '../../common/enums/extension-mode.enum';

var ActionList = {
  'set-ar': {
    name: 'Set aspect ratio',
    args: [{
      name: 'Automatic',
      arg: 'auto',
    },{
      name: 'Fit width',
      arg: 'fitw'
    },{
      name: 'Fit height',
      arg: 'fith',
    },{
      name: 'Reset',
      arg: 'reset',
    },{
      name: 'Ratio',
      customArg: true,
      hintHTML: '',
    }],
    scopes: {
      global: false,
      site: false,
      page: true,
    }
  },
  'set-stretch': {
    name: 'Set stretch',
    args: [{
      name: 'Normal',
      arg: Stretch.NoStretch
    },{
      name: 'Basic',
      arg: Stretch.Basic,
    },{
      name: 'Hybrid',
      arg: Stretch.Hybrid,
    },{
      name: 'Thin borders',
      arg: Stretch.Conditional,
    },{
      name: 'Default',
      arg: Stretch.Default,
      scopes: {
        site: true
      }
    }],
    scopes: {
      global: true,
      site: true,
      page: true,
    }
  },
  'set-alignment': {
    name: 'Set video alignment',
    args: [{
      name: 'Left',
      arg: VideoAlignment.Left,
    },{
      name: 'Center',
      arg: VideoAlignment.Center,
    },{
      name: 'Right',
      arg: VideoAlignment.Right
    },{
      name: 'Default',
      arg: VideoAlignment.Default,
      scopes: {
        site: true,
      }
    }],
    scopes: {
      global: true,
      site: true,
      page: true,
    }
  },
  'pan': {
    name: 'Pan',
    args: [{
      name: '',
      arg: 'toggle'
    }],
    scopes: {
      page: true,
    }
  },
  'toggle-pan': {
    name: 'Toggle panning mode',
    args: [{
      name: 'Toggle',
      arg: 'toggle',
    },{
      name: 'Enable',
      arg: 'enable',
    },{
      name: 'Disable',
      arg: 'disable'
    }],
    scopes: {
      page: true
    }
  },
  'change-zoom': {
    name: 'Zoom',
    args: [{
      name: 'Zoom level increase/decrease',
      customArg: true,
      hintHTML: '<small>Positive values zoom in, negative values zoom out. Increases/decreases are logarithmic: value of \'1\' will double the zoom, value of \'-1\' will halve it.</small>'
    }],
    scopes: {
      page: true,
    }
  },
  'set-zoom': {
    name: 'Set zoom level',
    args: [{
      name: 'Zoom level increase/decrease',
      customArg: true,
      hintHTML: '<small>Examples: 0.5 sets zoom to 50%, 1 sets zoom to 100%, 2 sets zoom to 200%. Don\'t use negative values unless you want to experience Australian youtube.</small>'
    }],
    scopes: {
      page: true,
    }
  },
  'set-extension-mode': {
    name: 'Set extension mode',
    args: [{
      name: 'Enable',
      arg: ExtensionMode.Enabled,
    },{
      name: 'On whitelisted only',
      arg: ExtensionMode.Whitelist,
      scopes: {
        global: true,
      }
    },{
      name: 'Default',
      arg: ExtensionMode.Default,
      scopes: {
        page: true,
      }
    },{
      name: 'Disable',
      arg: ExtensionMode.Default
    }],
    scopes: {
      global: true,
      site: true,
    }
  },
  'set-autoar-mode': {
    name: 'Set automatic aspect ratio detection mode',
    args: [{
      name: 'Enable',
      arg: ExtensionMode.Enabled,
    },{
      name: 'On whitelisted only',
      arg: ExtensionMode.Whitelist,
      scopes: {
        global: true,
      }
    },{
      name: 'Default',
      arg: ExtensionMode.Default,
      scopes: {
        page: true,
      }
    },{
      name: 'Disable',
      arg: ExtensionMode.Disabled
    }],
    scopes: {
      global: true,
      site: true,
    }
  }
};

export default ActionList;