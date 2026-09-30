import AspectRatioType from '../enums/AspectRatioType.enum';

export enum ArVariant {
  Crop = 0,
  Zoom = 1
}

export interface Ar {
  type: AspectRatioType,
  ratio?: number,
  variant?: ArVariant,
  offset?: number,
}
