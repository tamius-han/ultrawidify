import { InPlayerUIOptions } from '@src/common/interfaces/SettingsInterface';

export interface MenuItemConfig {
  label: string;
  subitems?: MenuItemConfig[];
  action?: () => void;
  customHTML?: HTMLElement | string;
  customId?: string;
  customClassList?: string;
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
  ui: InPlayerUIOptions;
  menuPosition: MenuPosition;
  items: MenuItemConfig[];
}
