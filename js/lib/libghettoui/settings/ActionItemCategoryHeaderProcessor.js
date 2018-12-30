class ActionItemCategoryHeaderProcessor extends BaseElement {
  static addCategoryName(table, categoryName) {
    var row = document.createElement('tr');
    row.innerHTML = `<td class="action-item-category-label">${categoryName}</td>`;
    table.appendChild(row);
  }

  static addTableHeader(table) {
    var topRow = document.createElement('tr');
    var bottomRow = document.createElement('tr');

    topRow.innerHTML = `
      <th class="cmd" rowspan="2">Command</th>
      <th class="" rowspan="2">Displayed name</th>
      <th class="" rowspan="2">Shortcut</th>
      <th class="" rowspan="2">Mouse action?</th>
      <th colspan="3">Show in popup</th>
      <th colspan="2">[reserved for future use]</th>
    `;

    bottomRow.innerHTML = `
      <th class="action-item-table-header-small">Global</th>
      <th class="action-item-table-header-small">Site</th>
      <th class="action-item-table-header-small">Video</th>
      <th class="action-item-table-header-small">Show</th>
      <th class="action-item-table-header-small">Menu path</th>
    `;

    topRow.classList.add("action-item-table-header");
    bottomRow.classList.add(["action-item-table-header", "action-item-table-header-small"])

    table.appendChild(topRow);
    table.appendChild(bottomRow);
  }
}