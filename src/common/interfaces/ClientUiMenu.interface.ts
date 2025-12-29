export interface MenuItemConfig {
  label: string;
  subitems?: MenuItemConfig[];
  action?: () => void;
  customHTML?: HTMLElement;
}

export enum MenuPosition {
  TopLeft = 'top-left',
  Left = 'left',
  BottomLeft = 'bottom-left',
  Top = 'top',
  Bottom = 'bottom',
  TopRight = 'top-right',
  Right = 'right',
  BottomRight = 'bottom-right',
}

export interface MenuConfig {
  isGlobal?: boolean;
  menuPosition: MenuPosition;
  activationRadius?: number;
  items: MenuItemConfig[];
}
