export enum DiffMode {
  DEFAULT = 'default', // HEAD^ vs HEAD
  WORKING = 'working', // staged vs working
  STAGED = 'staged', // HEAD vs staged
  DOT = 'dot', // HEAD vs working (all changes)
  SPECIFIC = 'specific', // commit vs commit (no watching)
}

export interface FileWatchConfig {
  watchPath: string;
  diffMode: DiffMode;
  ignore: string[];
  debounceMs: number;
  backend?: 'fs-events' | 'watchman' | 'windows' | 'linux';
}

export interface WatchEvent {
  type: 'reload' | 'error' | 'connected';
  diffMode: DiffMode;
  changeType: 'file' | 'commit' | 'staging';
  timestamp: string;
  message?: string;
}

export interface ClientWatchState {
  isWatchEnabled: boolean;
  diffMode: DiffMode;
  shouldReload: boolean;
  isReloading: boolean;
  lastChangeTime: Date | null;
  lastChangeType: 'file' | 'commit' | 'staging' | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}
