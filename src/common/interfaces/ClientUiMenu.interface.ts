import { CommandInterface, InPlayerUIOptions } from '@src/common/interfaces/SettingsInterface';

export interface MenuItemBaseConfig {
  label?: string;
  subitems?: MenuItemConfig[];
  command?: CommandInterface,
  action?: () => void;
  customHTML?: HTMLElement | string;
  customId?: string;
  customClassList?: string;
}

export type MenuItemConfig = MenuItemBaseConfig & ({label: string} | {customHTML: HTMLElement | string});

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
  options?: {forceShow?: boolean};
  items: MenuItemConfig[];
}
