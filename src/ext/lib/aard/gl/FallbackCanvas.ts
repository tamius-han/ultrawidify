import { GlCanvas, GlCanvasOptions } from './GlCanvas';


export class FallbackCanvas extends GlCanvas {
  get type() {
    return 'legacy';
  }
  context: CanvasRenderingContext2D;

  constructor(options: GlCanvasOptions) {
    super(options);
  }

  /**
   * We need to override the following methods in order to avoid default behaviour,
   * since these methods in GlCanvas touch some webGL properties that we cannot really
   * touch in this class.
   */

  destroy() {  }

  protected initContext() {
    this.context = this.canvas.getContext('2d', {desynchronized: true});
  }

  protected initWebgl() { }

  drawVideoFrame(video: HTMLVideoElement) {
    this.context.drawImage(video, 0, 0, this.context.canvas.width, this.context.canvas.height);
  }

  getImageData() {
    this.frameBuffer = this.context.getImageData(0,0,this.context.canvas.width,this.context.canvas.height).data as any as Uint8Array;
    return this.frameBuffer;
  }

}
