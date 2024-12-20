import { McDimension, CmdDesc, optionalArgTypes, getDimensions } from "./bmtp-types"
import { Player } from "@minecraft/server"
export let DEBUG = false;
export function disableDebug() {
  DEBUG = false;
}

function dimIdString(dim: McDimension): string {
  switch (dim) {
    case McDimension.END: return "minecraft:the_end"
    case McDimension.NETHER: return "minecraft:nether"
    case McDimension.OVERWORLD: return "minecraft:overworld"
  }
}

export function translateDimension(player: Player): McDimension {
  const foundDim = getDimensions().find(d => dimIdString(d) === player.dimension.id);
  if (foundDim !== undefined) {
    return foundDim;
  }
  const msg = `Dimension Id ${player.dimension.id} not recognised!`;
  player.sendMessage("ERROR, please report this: " + msg);
  throw new Error(msg);
}

export function getMandatoryArgCount(cmd: CmdDesc): number {
  return cmd.argDesc.filter(d => !optionalArgTypes().has(d.type)).length;
}