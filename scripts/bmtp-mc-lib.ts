import { McDimension, CmdDesc, getDimensions } from "./bmtp-types"
import { Dimension } from "@minecraft/server"
let DEBUG = false;

export function getDebug(): boolean {
  return DEBUG;
}

export function disableDebug() {
  DEBUG = false;
}

let debugLogger = (msg: string) => console.log(msg);
let emergencyLogger = (msg: string) => console.log(msg);

export function setLoggers(debug: (msg: string) => void, emergency: (msg: string) => void) {
  debugLogger = debug;
  emergencyLogger = emergency;
}

let QUIET = false;
export function setQuietMode(val: boolean) {
  QUIET = val;
}

export function debug(msg: string) {
  if (DEBUG) {
    debugLogger(`DBG: ${msg}`);
  } else if (!QUIET) {
    console.log(`DBG: ${msg}`);
  }
}

export function emergency(msg: string) {
  emergencyLogger(msg);
}

export function dimIdString(dim: McDimension): string {
  switch (dim) {
    // using MinecraftDimensionTypes.* constants will make testing impossible
    case McDimension.END: return "minecraft:the_end"
    case McDimension.NETHER: return "minecraft:nether"
    case McDimension.OVERWORLD: return "minecraft:overworld"
  }
}

export function translateDimension(dimension: Dimension): McDimension {
  const foundDim = getDimensions().find(d => dimIdString(d) === dimension.id);
  if (foundDim !== undefined) {
    return foundDim;
  }
  throw new Error(`Dimension Id ${dimension.id} not recognised!`);
}

export function getMandatoryArgCount(cmd: CmdDesc): number {
  return cmd.argDesc.filter(d => !d.optional).length;
}