export enum TransparencyVerificationResult {
  Ok = 0,
  Fail = 1,
  NoVisibleElements = 2,
  Error = 3
}

export interface IframeVerificationData {
  tab: {
    width: number,
    height: number,
  },
  player: IframeVerificationPlayerData
}

export interface IframeVerificationPlayerData {
  x: number,
  y: number,
  width: number,
  height: number,
}

interface IframeCheckItem {
  position: 'top' | 'center' | 'bottom' | 'left' | 'right';
  offset: number;
}

interface IframeCheckPosition {
  positionX: 'top' | 'center' | 'bottom';
  positionY: 'left' | 'center' | 'right';
  offsetX: number;
  offsetY: number;
}

export class IframeTransparencyVerifier {

  async verifyUiTransparency(windowId: number, tabDimensions: IframeVerificationData): Promise<TransparencyVerificationResult> {
    const {visibleX, visibleY} = this.getVisibleMarkers(tabDimensions);
    if (!visibleX.length || visibleY.length) {
      return TransparencyVerificationResult.NoVisibleElements;
    }

    const checkPositions = this.processMarkers(visibleX, visibleY);

    const dataUrl = await chrome.tabs.captureVisibleTab(
      windowId,
      {
        format: "png"
      }
    );

    try {
      const canvas = new OffscreenCanvas(tabDimensions.tab.width, tabDimensions.tab.height);
      const ctx = canvas.getContext('2d')!;

      const image = new Image();
      const imageLoadPromise = new Promise(r => image.onload = r);
      image.src = dataUrl;
      await imageLoadPromise;
      (ctx as any).drawImage(image, 0, 0);

      const imageData = (ctx as any).getImageData(0, 0, tabDimensions.tab.width, tabDimensions.tab.height).data;

      if (this.detectMarkers(checkPositions, tabDimensions.tab.width, imageData)) {
        return TransparencyVerificationResult.Ok;
      } else {
        return TransparencyVerificationResult.Fail;
      }
    } catch (e) {
      return TransparencyVerificationResult.Error;
    }
  }

  private getVisibleMarkers({tab, player}: IframeVerificationData) {
    const visibleX: IframeCheckItem[] = [];
    const visibleY: IframeCheckItem[] = [];

    // Determine which markers should be visible.

    // Visibility: TOP ROW
    if (player.y >= 0 && player.y < tab.height) {
      visibleY.push({
        position:  'top',
        offset: player.y,
      });
    }

    // Visibility: CENTER
    const yHalfPosition = Math.floor(player.y + player.height / 2);
    if (player.y + yHalfPosition - 2 > 0 || player.y + yHalfPosition + 2 < tab.height) {
      visibleY.push({
        position: 'center',
        offset: player.y + yHalfPosition,
      });
    }

    // Visibility: BOTTOM ROW
    if (player.y + player.height - 1 > 0 || player.y + player.height + 1 < tab.height) {
      visibleY.push({
        position: 'bottom',
        offset: player.y + player.height - 1,
      });
    }

    // Visibility: LEFT SIDE
    if (player.x >= 0 && player.x < tab.width) {
      visibleX.push({
        position: 'left',
        offset: player.x,
      });
    }

    // Visibility: X CENTER
    const xHalfPosition = Math.floor(player.x + player.width / 2);
    if (player.x + xHalfPosition - 2 > 0 || player.x + xHalfPosition + 2 < tab.width) {
      visibleY.push({
        position: 'center',
        offset: player.x + xHalfPosition,
      });
    }

    // Visibility: RIGHT SIDE
    if (player.x + player.width - 1 > 0 || player.x + player.width + 1 < tab.width) {
      visibleX.push({
        position: 'right',
        offset: player.x + player.width - 1,
      });
    }

    return {
      visibleX,
      visibleY,
    };

  }

  private processMarkers(candidatesX: IframeCheckItem[], candidatesY: IframeCheckItem[]): IframeCheckPosition[] {
    if (!candidatesX.length || !candidatesY.length) {
      return [] as IframeCheckPosition[];
    }

    const checkPositions: IframeCheckPosition[] = [];

    for (const row of candidatesY) {
      for (const col of candidatesX) {
        // 'center center' is not valid position.
        if (row.position !== col.position) {
          checkPositions.push({
            positionX: row.position as 'top' | 'center' | 'bottom',
            positionY: col.position as 'left' | 'center' | 'right',
            offsetX: col.offset,
            offsetY: row.offset,
          });
        }
      }
    }

    return checkPositions;
  }

  private detectMarkers(checkPositions: IframeCheckPosition[], rowLength: number, imageData: Uint8ClampedArray): boolean {
    for (const position of checkPositions) {
      if (position.positionY === 'center') {
        if (this.detectColumnMarker(position.offsetX, position.offsetY, rowLength, imageData)) {
          return true;
        }
      } else {
        if (this.detectRowMarker(position.offsetX, position.offsetY, rowLength, imageData)) {
          return true;
        }
      }
    }

    return false;
  }

  // Checks if our magic sequence is present in a row configuration
  private detectRowMarker(x, y, rowLength, imageData): boolean {
    const start = (y * rowLength + x) * 4;

    return   imageData[start] === 0
      && imageData[start + 1] === 1
      && imageData[start + 2] === 2
      && imageData[start + 4] === 3
      && imageData[start + 5] === 4
      && imageData[start + 6] === 5
      && imageData[start + 8] === 5
      && imageData[start + 9] === 4
      && imageData[start + 10] === 3
      && imageData[start + 12] === 2
      && imageData[start + 13] === 1
      && imageData[start + 15] === 0;
  }

  // Checks if our magic sequence is present in a column configuration
  private detectColumnMarker(x, y, rowLength, imageData) {
    const rowOffset = rowLength * 4;

    const r1 = (y * rowLength + x) * 4;
    const r2 = r1 + rowOffset;
    const r3 = r2 + rowOffset;
    const r4 = r3 + rowOffset;

    return   imageData[r1] === 0
      && imageData[r1 + 1] === 1
      && imageData[r1 + 2] === 2
      && imageData[r2    ] === 3
      && imageData[r2 + 1] === 4
      && imageData[r2 + 2] === 5
      && imageData[r3    ] === 5
      && imageData[r3 + 1] === 4
      && imageData[r3 + 2] === 3
      && imageData[r4    ] === 2
      && imageData[r4 + 1] === 1
      && imageData[r4 + 2] === 0;
  }
}
