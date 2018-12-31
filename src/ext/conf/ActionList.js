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
  'stretch': {
    name: 'Set stretch',
    args: [{
      name: 'Normal',
      arg: 0
    },{
      name: 'Basic',
      arg: 1,
    },{
      name: 'Hybrid',
      arg: 2,
    },{
      name: 'Thin borders',
      arg: 3,
    },{
      name: 'Default',
      arg: -1,
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
      arg: 'left',
    },{
      name: 'Center',
      arg: 'center',
    },{
      name: 'Right',
      arg: 'right'
    },{
      name: 'Default',
      arg: 'default',
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
  'set-zoom': {
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
  'set-extension-mode': {
    name: 'Set extension mode',
    args: [{
      name: 'Enable',
      arg: 'blacklist',
    },{
      name: 'On whitelisted only',
      arg: 'whitelist',
      scopes: {
        global: true,
      }
    },{
      name: 'Default',
      arg: 'default',
      scopes: {
        page: true,
      }
    },{
      name: 'Disable',
      arg: 'disabled'
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
      arg: 'blacklist',
    },{
      name: 'On whitelisted only',
      arg: 'whitelist',
      scopes: {
        global: true,
      }
    },{
      name: 'Default',
      arg: 'default',
      scopes: {
        page: true,
      }
    },{
      name: 'Disable',
      arg: 'disabled'
    }],
    scopes: {
      global: true,
      site: true,
    }
  }
};

export default ActionList;