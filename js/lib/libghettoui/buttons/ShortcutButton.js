class ShortcutButton extends Button {
  constructor(id, label, shortcutLabel, onClick, additionalClasses) {
    super(
      id,
      shortcutLabel ? `${label}<br/><span class="smallcaps small darker">(${shortcutLabel})</span>` : `${label}<br/><span class="smallcaps small darker">&nbsp;</span>`,
      onClick,
      additionalClasses
    );
  }
}