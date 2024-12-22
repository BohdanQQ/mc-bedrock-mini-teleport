import { world } from "@minecraft/server";
import { getLogger, EntryRef, DataProvider } from '../bmtp-data-providers';

class BasicEntry implements EntryRef {
  readonly log = getLogger('BasicEntry');
  readonly _key: string;
  _value: string | undefined;
  constructor(key: string) {
    this._key = key;
    const value = world.getDynamicProperty(this._key);
    if (value === undefined) {
      this.log(`Property under key ${this._key} fetched as undefined`);
      this._value = undefined;
    }
    else if (typeof value !== 'string') {
      this.log(`Unexpected property (type) under key ${this._key}: ${value?.toString()} - ${typeof value}`)
      this._value = undefined;
    } else {
      this._value = value;
    }
  }

  _rawSetValue(value: undefined | string): boolean {
    this.log(`Set ${this._key} to ${value}`);
    try {
      world.setDynamicProperty(this._key, value);
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

export const MC_WORLD_PROVIDER: Required<DataProvider> = {
  get(id: string) {
    const ref = new BasicEntry(id);
    if (ref.value() === undefined) {
      return undefined;
    }
    return ref;
  },

  set(id: string, val: string) {
    const entryRef = new BasicEntry(id);
    if (!entryRef.setValue(val)) {
      return undefined;
    }
    return entryRef;
  },

  knownKeys(): string[] {
    // this leaks a ton of information
    return world.getDynamicPropertyIds();
  }
};