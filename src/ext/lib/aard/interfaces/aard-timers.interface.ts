export interface AardTimers {
  nextFrameCheckTime: number;
}

export function initAardTimers(): AardTimers {
  return {
    nextFrameCheckTime: 0
  };
}
