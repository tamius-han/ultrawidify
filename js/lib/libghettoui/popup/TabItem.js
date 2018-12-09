class TabItem extends BaseElement {

  constructor (id, name, label, isIframe, onClick, badge, additionalClasses) {
    if (badge) {
      label = `<div style='display: inline-block; color:#fff; background-color:${badge.color}; padding:3px 6px 1px 6px; margin-right: 5px; font-size: 0.66em; min-width: 16px; text-align: center'>${badge.name}</div> ${label}`;
    }
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
