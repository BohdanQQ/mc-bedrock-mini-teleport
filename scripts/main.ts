import { world, system, Player } from "@minecraft/server";
import {
  BmTpCommand, dimString, getDimensions, Teleport, Help, ListCurrentDimension,
  ListAll, McDimension, RemoveLocation, AddFromCurrentLocation,
  AddFromCurrentDimension, Coord3, AddGeneralLocation,
  UpdateGeneralLocation,
  ExportAsSCSV
} from "./bmtp-types";
import { parseBmtpCommand, ParsingError, SilentError } from "./bmtp-parser";
import { DEBUG, disableDebug, translateDimension } from "./bmtp-mc-lib";
import { debugInspectProperties, getDimensionLocations, initialize, Location, locationFromDb, NEVERUSE_PURGE_ALL } from "./bmtp-locations";

function getLocationListString(d: McDimension): string {
  return Array.from(getDimensionLocations(d).entries())
    .map(([k, v]) => {
      const desc = v._description !== undefined ? ` - ${v._description}` : "";
      return `\u00A7e${k}\u00A7f: \u00A7b${v._coords?.x}\u00A7f, \u00A7b${v._coords?.y}\u00A7f, \u00A7b${v._coords?.z}\u00A7f${desc}`;
    }).join('\n');
}

function clrPink(s: string) {
  return `\u00A7d${s}\u00A7f`
}

function executeCommandAdd(name: string, dim: McDimension, { x, y, z }: Coord3, desc: string | undefined): string {
  try {
    const loc = new Location(name, dim, { x, y, z }, desc);
    loc.commitToDb();
  } catch (e) {
    return `Cannot create location ${clrPink(name)}: ${e}`;
  }
  return `Created ${clrPink(name)}!`;
}

function executeBmtpCommand(cmd: BmTpCommand, player: Player): void {
  const dim = translateDimension(player);
  const locations = getDimensionLocations(dim);
  const report = (s: string) => player.sendMessage(s);
  const debugReport = (s: string) => {
    if (DEBUG) { player.sendMessage(`DEBUG: ${s}`) }
  };
  if (cmd instanceof Help) {
    report(cmd.getHelpString());
    return;
  } else if (cmd instanceof ListCurrentDimension) {
    const msg = getLocationListString(dim).trimEnd();
    report(`Available locations in ${clrPink(dimString(dim))}: \n` + msg);
    return;
  } else if (cmd instanceof ListAll) {
    const msg = getDimensions().map(d => {
      const locs = getLocationListString(d);
      return locs.length === 0 ? '' : `${clrPink(dimString(d))}:\n` + getLocationListString(d);
    }).join('\n');
    report(`Available locations in all dimensions: \n${msg.trimEnd()} \n`);
    return;
  }
  else if (cmd instanceof Teleport) {
    if (DEBUG) {
      if (cmd.name === 'dbg-clear-IKNOWWHATIMDOING') {
        NEVERUSE_PURGE_ALL();
        debugReport('purged');
      } else if (cmd.name === 'dbg-exit') {
        disableDebug();
        debugReport('disabled debug, dbg- commands cannot be used unless they are valid locations');
      } else if (cmd.name === 'dbg-inspect') {
        debugReport(`all world dynamic properties recognised by bmtp:\n${debugInspectProperties()}`);
      }
    }
    const found = locations.get(cmd.name);
    const clrName = clrPink(cmd.name);
    if (found === undefined) {
      report(`Invalid location ${clrName} for the current dimension: ${clrPink(dimString(dim))}`);
      return;
    } else if (found._coords === undefined) {
      report(`Location ${clrName} is CORRUPTED.Report this!`);
      return;
    }
    const coords = found._coords;
    player.runCommandAsync(`tp ${coords.x} ${coords.y} ${coords.z}`).then(() => {
      report("Teleported to " + clrName);
    }).catch((err) => {
      report("Failed to teleport to " + clrName);
      report(`${err}`);
    });
  } else if (cmd instanceof RemoveLocation) {
    const clrName = clrPink(cmd.name);
    const location = locationFromDb(cmd.name, cmd.dim);
    if (location === undefined) {
      report(`Cannot remove missing location ${clrName} in ${clrPink(dimString(cmd.dim))}`);
      return;
    }
    try {
      location.remove();
    } catch (e) {
      report(`Removal failed: ${e}`);
      return;
    }
    report(`Removed ${clrName}!`);
  } else if (cmd instanceof AddFromCurrentLocation) {
    debugReport('AddFromCurrentLocation');
    report(executeCommandAdd(cmd.name, dim, { x: player.location.x, y: player.location.y, z: player.location.z }, cmd.desc));
  } else if (cmd instanceof AddFromCurrentDimension) {
    debugReport('AddFromCurrentDimension');
    report(executeCommandAdd(cmd.name, dim, cmd.loc, cmd.desc));
  } else if (cmd instanceof AddGeneralLocation) {
    debugReport('AddGeneralLocation');
    report(executeCommandAdd(cmd.name, cmd.dim, cmd.loc, cmd.desc));
  } else if (cmd instanceof UpdateGeneralLocation) {
    try {
      const loc = new Location(cmd.name, cmd.dim, cmd.loc, cmd.desc);
      loc.updateInDb();
    } catch (e) {
      report(`Cannot udpate location ${clrPink(cmd.name)}: ${e}`);
    }
    report(`Updated ${clrPink(cmd.name)}!`);
  } else if (cmd instanceof ExportAsSCSV) {
    const header = `dimension;x;y;z;name;description`;
    const lines = getDimensions()
      .map(d => getDimensionLocations(d))
      .flatMap(mp => Array.from(mp.values()))
      .map(l => `${dimString(l._dimension)};${l._coords!.x};${l._coords!.y};${l._coords!.z};${l._name};${l._description === undefined ? "" : l._description}`)
      .join('\n');
    const res = `${header}\n${lines}`;
    report(`${res}\n\nExport also available in server console. (you probably cannot select text anyway :( Thanks, Microsoft )`);
    console.log(res);
  } else {
    player.sendMessage("Unknown command!");
  }
}

function bindCmdHandler() {
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
  world.sendMessage(`DEBUG ${DEBUG ? '' : "is NOT"} enabled`);
  if (DEBUG) {
    // allows handling of debug commands even if initialization fails
    bindCmdHandler();
  }
  const res = initialize();
  if (res !== undefined) {
    world.sendMessage(res);
    return;
  }

  if (!DEBUG) {
    bindCmdHandler();
  }
  world.sendMessage("BmTp is ready!");
}

system.run(bmtpBind);
