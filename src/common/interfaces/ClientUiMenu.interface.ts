export interface MenuItemConfig {
  label: string;
  subitems?: MenuItemConfig[];
  action?: () => void;
  customHTML?: HTMLElement;
}

export type MenuAnchor =
  | "LeftCenter"
  | "RightCenter"
  | "TopCenter"
  | "BottomCenter"
  | "TopLeft"
  | "TopRight"
  | "BottomLeft"
  | "BottomRight";

export interface MenuConfig {
  anchor: MenuAnchor;
  activationRadius: number;
  items: MenuItemConfig[];
}
