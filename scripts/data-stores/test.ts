import { DataStore } from "../bmtp-data-providers";

const data = new Map<string, string | undefined>();

export function resetData() {
  data.clear();
}

export const TEST_BACKEND: Required<DataStore> = {
  get(key) {
    const val = data.get(key);
    return val;
  },
  keys() {
    return Array.from(data.keys());
  },
  set(key, value) {
    data.set(key, value);
  },
}