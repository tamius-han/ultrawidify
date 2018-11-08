class TabItem {
  static create(id, text, isIframe, onClick) {
    var tabitem = document.createElement('div');
    tabitem.classList.add('tabitem');
    if (isIframe) {
      tabitem.classList.add('tabitem-iframe');
    }
    tabitem.setAttribute('id', id);
    tabitem.textContent = text;
    tabitem.addEventListener('click', onClick);

    return tabitem;
  }
}
