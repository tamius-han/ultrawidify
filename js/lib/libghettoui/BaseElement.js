class BaseElement {
  constructor(id, label, onClick, additionalClasses, existingElement) {
    if (existingElement) {
      this.element = existingElement;
    } else {
      this.element = document.createElement('div');
      this.element.setAttribute('id', id);
    }
    if (additionalClasses) {
      this.element.classList.add(...additionalClasses);
    }
    if (onClick) {
      this.element.addEventListener('click', onClick);
    }
    if (label && !existingElement) {
      this.element.innerHTML = label;
    }
  }

  static fromExisting(element, onClick){
    return new BaseElement(undefined, undefined, onClick, undefined, element);
  }

  disable() {
    this.element.classList.add('disabled');
  }
  enable() {
    this.element.classList.remove('disabled');
  }
  hide() {
    this.element.classList.add('hidden');
  }
  show() {
    this.element.classList.remove('hidden');
  }
  select() {
    this.element.classList.add('selected');
  }
  unselect() {
    this.element.classList.remove('selected');
  }
  appendTo(element) {
    if (element.element) {
      element.element.appendChild(this.element);
    } else {
      element.appendChild(this.element);
    }
  }
  removeChildren() {
    while (this.element.lastChild) {
      this.element.removeChild(this.element.lastChild);
    }
  }
}