if (process.env.CHANNEL !== 'stable') {
  console.info('Loading ExtensionMode');
}


var ExtensionMode = Object.freeze({
  AutoDisabled: -2,
  Disabled: -1,
  Default: 0,
  Whitelist: 1,
  Basic: 2,
  Enabled: 3,
});

if (process.env.CHANNEL !== 'stable') {
  console.info('Loaded ExtensionMode');
}

export default ExtensionMode;
