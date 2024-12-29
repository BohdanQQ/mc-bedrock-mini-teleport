import { debug } from './bmtp-mc-lib';

export function getLogger(prefix: string) {
  return (msg: string) => debug(`${prefix} | ${msg}`);
}

let currentProvider: null | DataProvider = null;

export interface EntryRef {
  setValue(value: string): boolean;
  value(): undefined | string;
  unset(): boolean
}

export interface DataProvider {
  get(key: string): EntryRef | undefined;
  set(key: string, value: string): EntryRef | undefined;
  knownKeys(): string[];
}

export interface DataStore {
  get(key: string): string | undefined;
  set(key: string, value: undefined | string): void;
  keys(): string[];
}

class BasicEntry implements EntryRef {
  readonly log = getLogger('BasicEntry');
  readonly _key: string;
  readonly _store: DataStore
  _value: string | undefined;
  constructor(key: string, store: DataStore) {
    this._key = key;
    this._store = store;
    const value = store.get(this._key);
    if (value === undefined) {
      this.log(`Property under key ${this._key} fetched as undefined`);
      this._value = undefined;
    } else {
      this._value = value;
    }
  }

  _rawSetValue(value: undefined | string): boolean {
    this.log(`Set ${this._key} to ${value}`);
    try {
      this._store.set(this._key, value);
    } catch (e) {
      this.log(`Error: ${e}`);
      return false;
    }
    return true;
  }

  setValue(value: string): boolean {
    return this._rawSetValue(value);
  }

  value(): undefined | string {
    this.log(`get ${this._key} ${this._value}`)
    return this._value;
  }

  unset(): boolean {
    return this._rawSetValue(undefined);
  }
}

function encapsulateStoreInProvider(store: DataStore): Required<DataProvider> {
  return {
    get(id: string) {
      const ref = new BasicEntry(id, store);
      if (ref.value() === undefined) {
        return undefined;
      }
      return ref;
    },

    set(id: string, val: string) {
      const entryRef = new BasicEntry(id, store);
      if (!entryRef.setValue(val)) {
        return undefined;
      }
      return entryRef;
    },

    knownKeys(): string[] {
      // this leaks a ton of information
      return store.keys();
    }
  };
}

export function initProvider(store: DataStore) {
  currentProvider = encapsulateStoreInProvider(store);
}

export function getProvider(): null | DataProvider {
  return currentProvider;
}