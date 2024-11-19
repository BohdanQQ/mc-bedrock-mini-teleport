import { world, system, Player } from "@minecraft/server";
import { staticLocations } from "./locations";
import { BmTpLocationMap, Coord3, McDimensions, BmTpCommand, dimString, HelpAll, HelpCurrentDimension, Teleport, BmTpDimensionLocations } from "./bmtp-types";
import { parseBmtpCommand } from "./bmtp-parser";

function dimIdString(dim: McDimensions): string {
  switch (dim) {
    case McDimensions.END: return "minecraft:the_end"
    case McDimensions.NETHER: return "minecraft:nether"
    case McDimensions.OVERWORLD: return "minecraft:overworld"
  }
}

function translateDimension(player: Player): McDimensions {
  switch (player.dimension.id) {
    case dimIdString(McDimensions.OVERWORLD): return McDimensions.OVERWORLD
    case dimIdString(McDimensions.NETHER): return McDimensions.NETHER
    case dimIdString(McDimensions.END): return McDimensions.END
  }
  const msg = `Dimension Id ${player.dimension.id} not recognised!`;
  player.sendMessage("ERROR, please report this: " + msg);
  throw new Error(msg);
}

function getLocationListString(ls: Iterable<[string, Coord3]>): string {
  return Array.from(ls).map(([k, { x, y, z }]) => `${k}: ${x}, ${y}, ${z}`).join("\n");
}

function getPlayerDimensionLocations(p: Player, ls: BmTpLocationMap): BmTpDimensionLocations {
  const dim = translateDimension(p);
  let dimensionLocations = ls.get(translateDimension(p));
  if (dimensionLocations === undefined) {
    dimensionLocations = new Map();
  }
  return dimensionLocations;
}

function executeBmtpCommand(cmd: BmTpCommand, player: Player, locations: BmTpLocationMap): void {
  if (cmd instanceof HelpCurrentDimension) {
    const dim = translateDimension(player);
    let dimensionLocations = getPlayerDimensionLocations(player, locations);
    player.sendMessage(`Available locations in ${dimString(dim)}:\n` + getLocationListString(dimensionLocations.entries()));
    return;

  } else if (cmd instanceof HelpAll) {
    const msg = Array.from(locations.entries())
      .map(([dim, dimensionLocations]) => dimensionLocations.size === 0 ? "" : `_____${dimString(dim)}:_____\n${getLocationListString(dimensionLocations.entries())}\n`)
      .reduce((p, c) => p + c);
    player.sendMessage("Available locations in all dimensions: \n" + msg);
    return;
  } else if (cmd instanceof Teleport) {
    const dim = translateDimension(player);
    let dimensionLocations = getPlayerDimensionLocations(player, locations);
    const dimLookup = dimensionLocations.get(cmd.value);
    if (dimLookup === undefined) {
      player.sendMessage("Invalid location " + cmd.value + " for the current dimension: " + dimString(dim));
      return;
    }
    const { x, y, z } = dimLookup;
    player.runCommandAsync(`tp ${x} ${y} ${z}`).then(() => {
      player.sendMessage("Teleported to " + cmd);
    }).catch((err) => {
      player.sendMessage("Failed to teleport to " + cmd);
    });
  } else {
    player.sendMessage("Unknown command!");
  }
}

function bmtpBind(): void {
  world.sendMessage("BmTp is being activated!");
  if (!world.afterEvents) {
    world.sendMessage("No afterEvents found!");
    return;
  } else if (!world.afterEvents.chatSend) {
    world.sendMessage("No chatSend events found! Beta API has changed.");
    return;
  }
  world.afterEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const msg = eventData.message;
    const cmd = parseBmtpCommand(msg);
    if (cmd != null) {
      executeBmtpCommand(cmd, player, staticLocations);
    }
  });
  world.sendMessage("BmTp is ready!");
}

system.run(bmtpBind);
