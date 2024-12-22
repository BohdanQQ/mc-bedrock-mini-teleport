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

export function initProvider(provider: DataProvider) {
  currentProvider = provider;
}

export function getProvider(): null | DataProvider {
  return currentProvider;
}