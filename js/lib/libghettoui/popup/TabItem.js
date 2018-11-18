class TabItem extends BaseElement {

  constructor (id, name, label, isIframe, onClick, additionalClasses) {
    super(id, label, onClick, additionalClasses);
    this.element.classList.add('tabitem');
    if (isIframe) {
      this.element.classList.add('tabitem-iframe');
    }
    this.name = name;
  }

  select() {
    super.select();
    this.element.classList.add('tabitem-selected');
  }
  unselect() {
    super.unselect();
    this.element.classList.remove('tabitem-selected');
  }
}
