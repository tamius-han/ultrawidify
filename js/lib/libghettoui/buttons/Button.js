class Button extends BaseElement {
  constructor(id, label, onClick, additionalClasses) {
    console.log("additional classes", additionalClasses)

    super(
      id,
      label,
      onClick,
      additionalClasses
    );
    this.element.classList.add('button');
  }
}