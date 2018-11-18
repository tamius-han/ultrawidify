class ShortcutButton extends Button {
  constructor(id, label, shortcutLabel, onClick, additionalClasses) {
    console.log("additional classes -- sb", additionalClasses)
    super(
      id,
      `${label}<br/><span class="smallcaps small darker">(${shortcutLabel})`,
      onClick,
      additionalClasses
    );
  }
}