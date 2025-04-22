import { settings } from 'cluster'
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

export interface SettingsSnapshotOptions {
  isAutomatic?: boolean,
  isProtected?: boolean,
  isDefault?: boolean,
  label?: string,
  forVersion?: string
}

export class SettingsSnapshotManager {
  private MAX_AUTOMATIC_SNAPSHOTS = 5;

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

  async createSnapshot(settings: SettingsInterface, options?: SettingsSnapshotOptions) {
    const snapshot = {
      ...options,
      label: options.label ?? 'Automatic snapshot',
      forVersion: options.forVersion || settings.version,
      settings: JSON.parse(JSON.stringify(settings)),
      createdAt: new Date(),
    };

    const snapshots = await this.listSnapshots();
    const automaticSnapshots = snapshots.filter((s) => s.isAutomatic && !s.isProtected);

    if (options.isAutomatic && automaticSnapshots.length >= this.MAX_AUTOMATIC_SNAPSHOTS) {
      const firstAutomaticIndex = snapshots.findIndex((s) => s.isAutomatic && !s.isProtected);
      snapshots.splice(firstAutomaticIndex, 1);
    }

    snapshots.push(snapshot);
    this.set(snapshots);
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
      JSON.parse(ret['uwSettings-snapshots']) as SettingsSnapshot[];
    } catch (e) {
      return [] as SettingsSnapshot[];
    }
  }

  private async set(snapshots: SettingsSnapshot[]) {
    await chrome.storage.local.set({
      'uwSettings-snapshots': JSON.stringify(snapshots),
    });
  }
}
