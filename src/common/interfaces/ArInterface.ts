import AspectRatioType from '../enums/AspectRatioType.enum';

export enum ArVariant {
  Crop = undefined,
  Zoom = 1
}

export interface Ar {
  type: AspectRatioType,
  ratio?: number,
  variant?: ArVariant
}
