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
  'align': {
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
    }]
  }
};

export default ActionList;