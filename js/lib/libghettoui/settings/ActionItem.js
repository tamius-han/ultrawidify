class ActionItem extends BaseElement {
  constructor(id, action, onClick) {
    super(id, undefined, onClick, undefined, document.createElement('tr'));
    this.element.classList.add("action-list-item");
    
    let cmd = "";
    for (var c in action.cmd) {
      cmd += `${c > 0 ? '; ' : ''}${action.cmd[0].action} ${action.cmd[0].arg}`
    }

    this.element.innerHTML = `
      <td class="cmd monospace">${cmd}</td>
      <td class="label">${action.label ? action.label : ""}</td>
      <td class="shortcut">${action.parsedShortcut ? action.parsedShortcut : ""}</td>
      <td class="checkbox">
        <input type="checkbox" disabled ${
          action.shortcut && action.shortcut.length && (action.shortcut[0].onMouseMove || action.shortcut[0].onClick || action.shortcut[0].onScroll)  ?
          "checked" : ""
        }>
      </td>
      <td class="checkbox">
        <input type="checkbox" disabled ${action.popup_global ? "checked" : ""}>
      </td>
      <td class="checkbox">
        <input type="checkbox" disabled ${action.popup_site ? "checked" : ""}>
      </td>
      <td class="checkbox">
        <input type="checkbox" disabled ${action.popup_ ? "checked" : ""}>
      </td>
      <td class="checkbox">
        <input type="checkbox" disabled ${action.ui ? "checked" : ""}>
      </td>
      <td>${action.ui_path ? action.ui_path : ""}</td>
    `;
  }
}