import { world, system, Player } from "@minecraft/server";
import { BmTpLocationMap, Coord3, BmTpCommand, dimString, Teleport, BmTpDimensionLocations, Help } from "./bmtp-types";
import { parseBmtpCommand, ParsingError } from "./bmtp-parser";
import { translateDimension } from "./bmtp-mc-lib";
import { initialize } from "./bmtp-locations";
// TODO implement
// function getLocationListString(ls: Iterable<[string, Coord3]>): string {
//   return Array.from(ls).map(([k, { x, y, z }]) => `${k}: ${x}, ${y}, ${z}`).join("\n");
// }

// function getPlayerDimensionLocations(p: Player, ls: BmTpLocationMap): BmTpDimensionLocations {
//   const dim = translateDimension(p);
//   let dimensionLocations = ls.get(translateDimension(p));
//   if (dimensionLocations === undefined) {
//     dimensionLocations = new Map();
//   }
//   return dimensionLocations;
// }

// function executeBmtpCommand(cmd: BmTpCommand, player: Player): void {
//   if (cmd instanceof Help) {
//     const dim = translateDimension(player);
//     const dimensionLocations = getPlayerDimensionLocations(player, locations);
//     player.sendMessage(`Available locations in ${dimString(dim)}:\n` + getLocationListString(dimensionLocations.entries()));
//     return;

//   } else if (cmd instanceof HelpAll) {
//     const msg = Array.from(locations.entries())
//       .map(([dim, dimensionLocations]) => dimensionLocations.size === 0 ? "" : `_____${dimString(dim)}:_____\n${getLocationListString(dimensionLocations.entries())}\n`)
//       .reduce((p, c) => p + c);
//     player.sendMessage("Available locations in all dimensions: \n" + msg);
//     return;
//   } else if (cmd instanceof Teleport) {
//     const dim = translateDimension(player);
//     const dimensionLocations = getPlayerDimensionLocations(player, locations);
//     const dimLookup = dimensionLocations.get(cmd.value);
//     if (dimLookup === undefined) {
//       player.sendMessage("Invalid location " + cmd.value + " for the current dimension: " + dimString(dim));
//       return;
//     }
//     const { x, y, z } = dimLookup;
//     player.runCommandAsync(`tp ${x} ${y} ${z}`).then(() => {
//       player.sendMessage("Teleported to " + cmd.value);
//     }).catch((err) => {
//       player.sendMessage("Failed to teleport to " + cmd.value);
//     });
//   } else {
//     player.sendMessage("Unknown command!");
//   }
// }

function bmtpBind(): void {
  world.sendMessage("BmTp is being activated!");
  if (!world.afterEvents) {
    world.sendMessage("No afterEvents found!");
    return;
  } else if (!world.afterEvents.chatSend) {
    world.sendMessage("No chatSend events found! Beta API has changed.");
    return;
  }

  world.sendMessage("Initializing...");
  const res = initialize();
  if (res !== undefined) {
    world.sendMessage(res);
    return;
  }

  world.afterEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const msg = eventData.message;
    const cmd = parseBmtpCommand(msg);
    if (cmd instanceof ParsingError) {
      player.sendMessage(`ERROR: ${cmd.msg}`);
    } else {
      executeBmtpCommand(cmd, player);
    }
  });
  world.sendMessage("BmTp is ready!");
}

system.run(bmtpBind);
