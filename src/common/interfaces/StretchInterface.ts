import StretchType from '../enums/StretchType.enum';

export interface Stretch {
  type: StretchType,
  ratio?: number,
  limit?: number,
}
