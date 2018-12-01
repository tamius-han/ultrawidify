class ActionItem extends BaseElement {
  constructor(id, action, onClick) {
    super(id, undefined, onClick);
    this.element.classList.add("action-list-item", "flex", "flex-row");
    
    // action list item looks like this
    // [  action.label          | shortcut | visibility checkboxes ]

    var cmd = document.createElement('div')
    var label = document.createElement('div');
    var shortcut = document.createElement('div');
    var popupVideoCb = document.createElement('div');
    var popupSiteCb = document.createElement('div');
    var popupGlobalCb = document.createElement('div');
    var playerUi = document.createElement('div');
    
    cmd.classList.add('cmd', 'flex');
    label.classList.add('label', 'flex');
    shortcut.classList.add('shortcut', 'flex');
    popupVideoCb.classList.add('checkbox', 'flex');
    popupSiteCb.classList.add('checkbox', 'flex');
    popupGlobalCb.classList.add('checkbox', 'flex');
    playerUi.classList.add('checkbox', 'flex');

    for (var c in action.cmd) {
      cmd.textContent += `${c > 0 ? '; ' : ''}${action.cmd[0].action} ${action.cmd[0].arg}`
    }
    label.textContent = action.label;
    shortcut.textContent = action.parsedShortcut;

    this.element.appendChild(label);
    this.element.appendChild(cmd);
    this.element.appendChild(shortcut);
    this.element.appendChild(popupVideoCb);
    this.element.appendChild(popupSiteCb);
    this.element.appendChild(popupGlobalCb);
    this.element.appendChild(playerUi);
  }
}