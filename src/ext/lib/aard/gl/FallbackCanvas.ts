import { GlCanvas, GlCanvasOptions } from './GlCanvas';


export class FallbackCanvas extends GlCanvas {

  context: CanvasRenderingContext2D;

  constructor(options: GlCanvasOptions) {
    super(options);
    this.context = this.canvas.getContext('2d');
  }

  /**
   * We need to override the following methods in order to avoid default behaviour,
   * since these methods in GlCanvas touch some webGL properties that we cannot really
   * touch in this class.
   */

  destroy() {  }

  protected initWebgl() {  }

  drawVideoFrame(video: HTMLVideoElement) {
    this.context.drawImage(video, this.context.canvas.width, this.context.canvas.height);
  }

  getImageData() {
    this.frameBuffer = this.context.getImageData(0,0,this.context.canvas.width,this.context.canvas.height).data as any as Uint8Array;
    return this.frameBuffer;
  }

}
