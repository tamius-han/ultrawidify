import SettingsInterface from '@src/common/interfaces/SettingsInterface';

export interface SettingsSnapshot {
  isAutomatic?: boolean;
  isProtected?: boolean;
  isDefault?: boolean;
  forVersion: string;
  label: string;
  settings: SettingsInterface;
  createdAt: Date;
}

export interface SnapshotManagerSettings {
  maxAutomaticSnapshots: number,
  minVersions: number,
}


const SNAPSHOT_MANAGER_CONF = 'uwSettings-snapshot-manager-conf';

export class SettingsSnapshotManager {

  config: SnapshotManagerSettings;

  async init() {
    const ret = await chrome.storage.local.get(SNAPSHOT_MANAGER_CONF) as string;
    try {
      this.config = JSON.parse(ret[SNAPSHOT_MANAGER_CONF]);
    } catch (e) {
      this.config = {
        maxAutomaticSnapshots: 10,
        minVersions: 5
      };
    }
  }

  async saveConf() {
    await chrome.storage.local.set({
      [SNAPSHOT_MANAGER_CONF]: JSON.stringify(this.config)
    });
  }



  async getSnapshot(index?: number) {
    const snapshots = await this.listSnapshots();

    if (!index) {
      return snapshots.find(x => x.isDefault);
    } else {
      if (index < 0 || index >= snapshots.length) {
        throw new Error('Invalid index');
      }
      return snapshots[index];
    }
  }

  async createSnapshot(snapshot: Partial<SettingsSnapshot> & {settings: SettingsInterface}) {
    if (!snapshot.createdAt) {
      snapshot.createdAt = new Date()
    }
    if (!snapshot.forVersion) {
      snapshot.forVersion = snapshot.settings.version;
    }
    if (!snapshot.label) {
      snapshot.label = "Unknown snapshot"
    }


    const snapshots = await this.listSnapshots();
    const automaticSnapshots = snapshots
      .filter((s) => s.isAutomatic && !s.isProtected)
      .sort((a: SettingsSnapshot, b: SettingsSnapshot) => a.settings.version === b.settings.version ? 0 : a.settings.version < b.settings.version ? -1 : 1);

    let minVersionCount = 0;
    let lastVersion;
    for (const snap of automaticSnapshots) {
      if (lastVersion !== snap.settings.version) {
        minVersionCount++;
        lastVersion = snap.settings.version;
      }
    }

    if (snapshot.isAutomatic && automaticSnapshots.length >= this.config.maxAutomaticSnapshots && minVersionCount > this.config.minVersions) {
      const firstAutomaticIndex = snapshots.findIndex((s) => s.isAutomatic && !s.isProtected);
      snapshots.splice(firstAutomaticIndex, 1);
    }

    snapshots.push(snapshot as SettingsSnapshot);
    this.set(snapshots);
  }

  async updateSnapshot(snapshot: SettingsSnapshot) {
    const snapshots = await this.listSnapshots();
    const i = snapshots.findIndex((x: SettingsSnapshot) => x.createdAt === snapshot.createdAt);

    try {
      snapshots[i] = snapshot;
      this.set(snapshots);
    } catch (e) {
      console.error('uw::SettingsSnapshotManager::updateSnapshot — failed to update snapshot.', {e, i, snapshot, snapshots});
    }
  }

  async setDefaultSnapshot(index: number, isDefault: boolean) {
    const snapshots = await this.listSnapshots();
    if (index < 0 || index >= snapshots.length) {
      throw new Error('Invalid index');
    }
    if (isDefault) {
      for (const snapshot of snapshots) {
        snapshot.isDefault = false;
      }
    }
    snapshots[index].isDefault = isDefault;
    this.set(snapshots);
  }

  async markSnapshotAsProtected(index: number, isProtected: boolean) {
    const snapshots = await this.listSnapshots();
    if (index < 0 || index >= snapshots.length) {
      throw new Error('Invalid index');
    }
    snapshots[index].isProtected = isProtected;
    this.set(snapshots);
  }

  async deleteSnapshot(index: number) {
    const snapshots = await this.listSnapshots();
    if (index < 0 || index >= snapshots.length) {
      throw new Error('Invalid index');
    }
    snapshots.splice(index, 1);
    this.set(snapshots);
  }

  async listSnapshots(): Promise<SettingsSnapshot[]> {
    const ret = await chrome.storage.local.get('uwSettings-snapshots');
    try {
      const json = JSON.parse(ret['uwSettings-snapshots'] as string) as SettingsSnapshot[];
      return json;
    } catch (e) {
      return [] as SettingsSnapshot[];
    }
  }

  private async set(snapshots: SettingsSnapshot[] = []) {
    await chrome.storage.local.set({
      'uwSettings-snapshots': JSON.stringify(snapshots),
    });
  }
}
