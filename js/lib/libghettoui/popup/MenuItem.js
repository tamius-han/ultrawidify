class MenuItem extends BaseUi {
  constructor(id, label, sublabel, onClick, additionalClasses) {
    super(
      id, 
      `${label}<span class="menu-item-inline-desc"><br/>${sublabel}</span>`,
      onClick,
      additionalClasses
    );
    this.element.classList.add('menu-item');
    this.element.subitemList = document.createElement('div');
  }

  insertSubitem(subitemElement) {
    this.element.subitemList.appendChild(subitemElement);
  }

  removeSubitems() {
    while (this.element.subitemList.firstChild) {
      this.element.subitemList.removeChild(this.element.subitemList.firstChild);
    }
  }

  showSubitems() {
    this.element.subitemList.classList.remove('hidden');
  }

  hideSubitems() {
    this.element.subitemList.classList.add('hidden');
  }
}