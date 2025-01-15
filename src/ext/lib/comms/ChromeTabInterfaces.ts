export interface MessageSender {
  documentId?: string,
  frameId?: number,
  id: string,
  origin: string,
  tab: Tab,
  url: string,
}

export interface Tab {
  active: boolean,
  audible?: boolean,
  autoDiscardable: boolean,
  discarded: boolean,
  favIconUrl?: string,
  frozen?: boolean,
  groupId: number,
  height: number,
  highlighted: boolean,
  id?: number,
  incognito: boolean,
  index: number,
  lastAccessed: number,
  openerTabId?: number,
  pendingUrl?: string,
  pinned: boolean,
  sessionId: string,
  url?: string;
  width: number;
  windowId?: number;
}
