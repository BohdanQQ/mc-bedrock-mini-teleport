import { world, system, Player } from "@minecraft/server";
import { BmTpCommand, dimString, Teleport, Help, ListCurrentDimension, ListAll, McDimension } from "./bmtp-types";
import { parseBmtpCommand, ParsingError, SilentError } from "./bmtp-parser";
import { getDimensions, translateDimension } from "./bmtp-mc-lib";
import { getDimensionLocations, initialize } from "./bmtp-locations";

function getLocationListString(d: McDimension): string {
  return Array.from(getDimensionLocations(d).entries())
    .map(([k, v]) => `\u00A7e${k}\u00A7f: \u00A7b${v._coords?.x}\u00A7f, \u00A7b${v._coords?.y}\u00A7f, \u00A7b${v._coords?.z}\u00A7f`).join('\n');
}

// function getPlayerDimensionLocations(p: Player, ls: BmTpLocationMap): BmTpDimensionLocations {
//   const dim = translateDimension(p);
//   let dimensionLocations = ls.get(translateDimension(p));
//   if (dimensionLocations === undefined) {
//     dimensionLocations = new Map();
//   }
//   return dimensionLocations;
// }

function executeBmtpCommand(cmd: BmTpCommand, player: Player): void {
  const dim = translateDimension(player);
  if (cmd instanceof Help) {
    player.sendMessage(cmd.getHelpString());
    return;
  } else if (cmd instanceof ListCurrentDimension) {
    const msg = getLocationListString(dim);
    player.sendMessage(`Available locations in \u00A7d${dimString(dim)}\u00A7f: \n` + msg);
    return;
  } else if (cmd instanceof ListAll) {
    const msg = getDimensions().map(d => {
      return `\u00A7d${dimString(d)}\u00A7f:` + getLocationListString(dim);
    }).join('\n');
    player.sendMessage(`Available locations in all dimensions:\n${msg} \n`);
    return;
  }
  else if (cmd instanceof Teleport) {
    // const dim = translateDimension(player);
    // const dimensionLocations = getPlayerDimensionLocations(player, locations);
    // const dimLookup = dimensionLocations.get(cmd.value);
    // if (dimLookup === undefined) {
    //   player.sendMessage("Invalid location " + cmd.value + " for the current dimension: " + dimString(dim));
    //   return;
    // }
    // const { x, y, z } = dimLookup;
    // player.runCommandAsync(`tp ${x} ${y} ${z}`).then(() => {
    //   player.sendMessage("Teleported to " + cmd.value);
    // }).catch((err) => {
    //   player.sendMessage("Failed to teleport to " + cmd.value);
    // });
    player.sendMessage("TP!");
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
      player.sendMessage(`\u00A7cError!\u00A7f\n${cmd.msg}`);
    } else if (!(cmd instanceof SilentError)) {
      executeBmtpCommand(cmd, player);
    }
  });
  world.sendMessage("BmTp is ready!");
}

system.run(bmtpBind);
