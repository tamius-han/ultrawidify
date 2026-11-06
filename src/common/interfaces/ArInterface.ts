import AspectRatioType from '../enums/AspectRatioType.enum';

export enum ArVariant {
  Default = -1,
  FitVideo = 0,
  FillFrame = 1,
  None = 2,
}

export interface Ar {
  type: AspectRatioType,
  ratio?: number,
  variant?: ArVariant,
  offset?: number,
}
