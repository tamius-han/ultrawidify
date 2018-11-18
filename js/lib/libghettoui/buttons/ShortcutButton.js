class ShortcutButton extends Button {
  constructor(id, label, shortcutLabel, onClick, additionalClasses) {
    super(
      id,
      `${label}<br/><span class="smallcaps small darker">(${shortcutLabel})`,
      onClick,
      additionalClasses
    );
  }
}