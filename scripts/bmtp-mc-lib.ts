import { McDimension, CmdDesc, ArgType } from "./bmtp-types"
import { Player } from "@minecraft/server"

export function getDimensions(): McDimension[] {
  return [McDimension.OVERWORLD, McDimension.NETHER, McDimension.END];
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
  return cmd.argDesc.filter(d => ![ArgType.OptString].includes(d.type)).length;
}