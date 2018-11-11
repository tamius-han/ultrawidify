class ShortcutButton extends BaseUi {
  constructor(id, label, onClick, additionalClasses) {
    super(
      id,
      label,
      onClick,
      additionalClasses
    );
    this.element.classList.add('button');
  }
}