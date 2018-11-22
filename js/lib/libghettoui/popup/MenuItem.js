class MenuItem extends BaseElement {
  constructor(id, label, sublabel, onClick, additionalClasses) {
    super(
      id, 
      `${label}<span class="menu-item-inline-desc"><br/>${sublabel}</span>`,
      onClick,
      additionalClasses
    );
    this.element.classList.add('menu-item');
    this.subitemListElement = document.createElement('div');
    this.element.appendChild(this.subitemListElement);
    this.subitemList = [];
  }

  insertSubitem(subitem) {
    this.subitemList.push(subitem);
    this.subitemListElement.appendChild(subitem.element);
  }

  removeSubitems() {
    while (this.subitemListElement.lastChild) {
      this.subitemListElement.removeChild(this.subitemListElement.lastChild);
    }
    this.subitemList = [];
  }
  
  selectSubitem(subitemName) {
    for(let item of this.subitemList) {
      if (item.name === subitemName) {
        item.select();
      } else {
        item.unselect();
      }
    }
  }

  existsSubitem(subitemName) {
    for(let item of this.subitemList) {
      if (item.name === subitemName) {
        return true;
      }
    }
    return false;
  }

  selectFirstSubitem() {
    for(let item of this.subitemList) {
      item.unselect();
    }

    this.subitemList[0].select();
    return this.subitemList[0].name;
  }

  showSubitems() {
    this.subitemListElement.classList.remove('hidden');
  }

  hideSubitems() {
    this.subitemListElement.classList.add('hidden');
  }

  select() {
    super.select();
    this.showSubitems();
  }
  
  unselect() {
    super.unselect();
    this.hideSubitems();
  }

}