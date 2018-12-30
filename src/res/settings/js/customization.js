if (Debug.debug) {
  console.log("[customization.js] loading script for customization tab")
}

function loadActions() {
  if (Debug.debug) {
    console.log("[customization.js] loading actions\n", settings, "\n", settings.active.actions)
  }

  // build actions list

  const actions = settings.active.actions;

  const cropActions = actions.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-ar');
  const stretchActions = actions.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-stretch');
  const alignActions = actions.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-alignment');
  const zoomPanActions = actions.filter(action => action.cmd.length === 1 && (
    action.cmd[0].action === 'set-zoom' ||
    action.cmd[0].action === 'set-pan' || 
    action.cmd[0].action === 'pan' ||
    action.cmd[0].action === 'set-pan')
  );

  // this is shit on performance but it'll cut it for this job
  const otherActions = actions.filter(action => action.cmd.length > 1 || (
    action.cmd.length === 1 &&
    cropActions.indexOf(action) === -1 &&
    stretchActions.indexOf(action) === -1 &&
    alignActions.indexOf(action) === -1 &&
    zoomPanActions.indexOf(action) === -1 )
  );

  ActionItemCategoryHeaderProcessor.addCategoryName(ui.customization.actionList.element, "Crop actions");
  ActionItemCategoryHeaderProcessor.addTableHeader(ui.customization.actionList.element);
  loadActionSection(cropActions, ui.customization.actionList);
  ActionItemCategoryHeaderProcessor.addCategoryName(ui.customization.actionList.element, "Stretch actions");
  ActionItemCategoryHeaderProcessor.addTableHeader(ui.customization.actionList.element);
  loadActionSection(stretchActions, ui.customization.actionList);
  ActionItemCategoryHeaderProcessor.addCategoryName(ui.customization.actionList.element, "Alignment actions");
  ActionItemCategoryHeaderProcessor.addTableHeader(ui.customization.actionList.element);
  loadActionSection(alignActions, ui.customization.actionList);
  ActionItemCategoryHeaderProcessor.addCategoryName(ui.customization.actionList.element, "Zoom actions");
  ActionItemCategoryHeaderProcessor.addTableHeader(ui.customization.actionList.element);
  loadActionSection(zoomPanActions, ui.customization.actionList);
  ActionItemCategoryHeaderProcessor.addCategoryName(ui.customization.actionList.element, "Other actions");
  ActionItemCategoryHeaderProcessor.addTableHeader(ui.customization.actionList.element);
  loadActionSection(otherActions, ui.customization.actionList);

  ui.customization.actionItems.push(cropActions);
  ui.customization.actionItems.push(stretchActions);
  ui.customization.actionItems.push(alignActions);
  ui.customization.actionItems.push(zoomPanActions);
  ui.customization.actionItems.push(otherActions);

  console.log("ui.customization:", ui.customization)
}

function loadSectionHeader(title) {

}

function loadActionSection(actions, container) {
  for(const action of actions) {
    if (action.shortcut && action.shortcut[0].key) {
      action.parsedShortcut = KeyboardShortcutParser.parseShortcut(action.shortcut[0])
    }
    const actionIndex = settings.active.actions.indexOf(action);
    var newAction = new ActionItem(
      undefined,
      action,
      () => editShortcut(actionIndex)
    );
    newAction.appendTo(container);
  }
}

function editShortcut(actionIndex) {
  alert(`customization.js/editShortcut: Implement me pls. ActionIndex: ${actionIndex}`);
}