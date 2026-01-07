import { GlCanvas } from '../gl/GlCanvas';
import { GlDebugCanvas } from '../gl/GlDebugCanvas';

export interface AardCanvasStore {
  main: GlCanvas;
  debug?: GlDebugCanvas;
}
