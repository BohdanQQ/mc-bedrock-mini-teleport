import { world, system, Player } from "@minecraft/server";
import { staticLocations } from "./locations";
import { BmTpLocationMap, BmTpCommand } from "./bmtp-types";


function bmtpIsValidCandidate(candidate: string): boolean {
  const BMTP_COMMAND_HEAD: string = "!bmtp";
  return candidate.startsWith(BMTP_COMMAND_HEAD);
}

function parseBmtpCommand(candidate: string): null | BmTpCommand {
  if (!bmtpIsValidCandidate(candidate)) {
    return null;
  }

  const split = candidate.split(' ');
  if (split.length < 2) {
    return null;
  }
  const payload = split.slice(1);
  if (payload.length != 1) {
    return null;
  }

  return payload[0];
}

function executeBmtpCommand(cmd: BmTpCommand, player: Player, locations: BmTpLocationMap): void {
  if (cmd == "?" || cmd == "help") {
    const locationList = Array.from(locations.entries()).map(([k, { x, y, z }]) => `${k}: ${x}, ${y}, ${z}`).join("\n");
    player.sendMessage("Available locations: \n" + locationList);
    return;
  }
  if (!locations.has(cmd)) {
    player.sendMessage("Unknown location: " + cmd);
    return;
  }

  const { x, y, z } = locations.get(cmd)!;
  player.runCommandAsync(`tp ${x} ${y} ${z}`).then(() => {
    player.sendMessage("Teleported to " + cmd);
  }).catch((err) => {
    player.sendMessage("Failed to teleport to " + cmd);
  });
}

function bmtpBind(): void {
  world.sendMessage("BmTp is now active!");
  if (!world.afterEvents) {
    world.sendMessage("No events found!");
    return;
  } else if (!world.afterEvents.chatSend) {
    world.sendMessage("No chat events found! Beta API changed.");
    return;
  }
  world.afterEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const msg = eventData.message;
    if (bmtpIsValidCandidate(msg)) {
      const cmd = parseBmtpCommand(msg);
      if (cmd != null) {
        executeBmtpCommand(cmd, player, staticLocations);
      }
    }
  });
  world.sendMessage("Ready!");
}

system.run(bmtpBind);
