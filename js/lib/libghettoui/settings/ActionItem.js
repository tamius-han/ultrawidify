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
      <td class="shortcut center-text">${action.parsedShortcut ? action.parsedShortcut : ""}</td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox ${
            action.shortcut && action.shortcut.length && (action.shortcut[0].onMouseMove || action.shortcut[0].onClick || action.shortcut[0].onScroll)  ?
            "checkbox-checked" : ""
          }"></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox ${action.popup_global ? "checkbox-checked" : ""}"></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox ${action.popup_site ? "checkbox-checked" : ""}"></span>
          </div>
        </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox ${action.popup ? "checkbox-checked" : ""}"></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox ${action.ui ? "checkbox-checked" : ""}"></span>
        </div>
      </td>
      <td>${action.ui_path ? action.ui_path : ""}</td>
    `;
  }
}