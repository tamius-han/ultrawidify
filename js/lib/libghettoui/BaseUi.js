class BaseUi {
  constructor(id, label, onClick, additionalClasses) {
    this.element = document.createElement('div');
    this.element.setAttribute('id', id);
    if (additionalClasses) {
      this.element.classList.add(...additionalClasses);
    }
    if (onClick) {
      this.element.addEventListener('click', onClick);
    }
    this.element.innerHTML = label;
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
  appendTo(element) {
    element.appendChild(this.element);
  }
}