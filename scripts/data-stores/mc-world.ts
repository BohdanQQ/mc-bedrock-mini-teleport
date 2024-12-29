import { world } from "@minecraft/server";
import { DataStore } from "../bmtp-data-providers";
import { emergency } from '../bmtp-mc-lib';

export const MC_BACKEND: Required<DataStore> = {
  get(key) {
    const val = world.getDynamicProperty(key);
    if (val === undefined || typeof val !== 'string') {
      return undefined
    }
    return val;
  },
  keys() {
    return world.getDynamicPropertyIds();
  },
  set(key, value) {
    try {
      world.setDynamicProperty(key, value);
    } catch (e) {
      emergency(`Error when setting MC world's dynamic property`);
      if (e !== null && e !== undefined) {
        emergency(e.toString())
      }
    }
  }
}