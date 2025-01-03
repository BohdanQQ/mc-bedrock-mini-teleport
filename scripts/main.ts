import { world, system, Player, DimensionTypes, Dimension } from "@minecraft/server";
import {
  BmTpCommand, dimString, getDimensions, McDimension, Coord3,
  GET_HLP,
  LST_ALL,
  LST_DIM,
  JUST_TP,
  REM_GEN,
  ADD_CUR,
  ADD_DIM,
  ADD_GEN,
  UPD_GEN,
  EXP_CSV
} from "./bmtp-types";
import { parseBmtpCommand, ParsingError, SilentError } from "./bmtp-parser";
import { getDebug, disableDebug, translateDimension, setLoggers, dimIdString, emergency } from "./bmtp-mc-lib";
import { ColoredString, ChatColor } from "./bmtp-lib";
import { debugInspectProperties, getDimensionLocations, initialize, Location, NEVERUSE_PURGE_ALL } from "./bmtp-locations";
import { initProvider } from "./bmtp-data-providers";
import { MC_BACKEND } from "./data-stores/mc-world";

function getLocationListString(d: McDimension): string {
  return Array.from(getDimensionLocations(d).entries())
    .map(([k, v]) => {
      const desc = v._description !== undefined ? ` - ${v._description}` : "";
      return new ColoredString('', ChatColor.White)
        .colored(ChatColor.Yellow, `${k}`)
        .text(': ')
        .colored(ChatColor.Aqua, `${v._coords?.x}`)
        .text(', ')
        .colored(ChatColor.Aqua, `${v._coords?.y}`)
        .text(', ')
        .colored(ChatColor.Aqua, `${v._coords?.z}`)
        .text(` ${desc}`)
        .value()
    }).join('\n');
}

function clrPink(s: string) {
  return new ColoredString('', ChatColor.White).colored(ChatColor.LightPurple, `${s}`).value();
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

// function cannot be inside mc-lib, because tests wont execute that way 
// gets Dimension based on the dimension specifier (or returns the supplied default value)
function dimensionOrDefault(specifier: McDimension | undefined, defaultValue: Dimension): Dimension {
  if (specifier === undefined) {
    return defaultValue;
  }
  const dimType = DimensionTypes.get(dimIdString(specifier));
  if (dimType !== undefined) {
    return world.getDimension(dimType.typeId);
  } else {
    return defaultValue
  }
}

function executeBmtpCommand(cmd: BmTpCommand, player: Player): void {
  const dim = translateDimension(player.dimension);
  const report = (s: string) => player.sendMessage(s);
  const debugReport = (s: string) => {
    if (getDebug()) { player.sendMessage(`DEBUG: ${s}`) }
  };
  const icmd = cmd.cmd;
  switch (icmd.type) {
    case GET_HLP:
      report(icmd.val.getHelpString());
      return
    case LST_ALL:
      {
        const msg = getDimensions().map(d => {
          const locs = getLocationListString(d);
          return locs.length === 0 ? '' : `${clrPink(dimString(d))}:\n` + getLocationListString(d);
        }).join('\n');
        report(`Available locations in all dimensions: \n${msg.trimEnd()} \n`);
        return
      }
    case LST_DIM: {
      const msg = getLocationListString(dim).trimEnd();
      report(`Available locations in ${clrPink(dimString(dim))}: \n` + msg);
      return;
    }
    case JUST_TP: {
      const cmd = icmd.val;
      // handle debug commands first
      if (getDebug()) {
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

      // re-determine the dimension - can be overriden by the teleport command
      const dimension = dimensionOrDefault(cmd.dim, player.dimension);
      const dim = translateDimension(dimension);
      const found = getDimensionLocations(dim).get(cmd.name)
      const clrName = clrPink(cmd.name);
      if (found === undefined) {
        report(`Invalid location ${clrName} for the dimension: ${clrPink(dimString(dim))}`);
        return;
      } else if (found._coords === undefined) {
        report(`Location ${clrName} is CORRUPTED.Report this!`);
        return;
      }
      const coords = found._coords;
      try {
        // for some reason, checkForBlocks: true does not do anything
        player.teleport(coords, { dimension });
        report("Teleported to " + clrName);
      } catch (err) {
        report("Failed to teleport to " + clrName);
        report(`${err}`);
      }
      return;
    }
    case REM_GEN: {
      const cmd = icmd.val;
      const clrName = clrPink(cmd.name);
      const location = getDimensionLocations(cmd.dim).get(cmd.name);
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
      return;
    }
    case ADD_CUR: {
      const cmd = icmd.val;
      debugReport('AddFromCurrentLocation');
      report(executeCommandAdd(cmd.name, dim, { x: player.location.x, y: player.location.y, z: player.location.z }, cmd.desc));
      return;
    }
    case ADD_DIM: {
      const cmd = icmd.val;
      debugReport('AddFromCurrentDimension');
      report(executeCommandAdd(cmd.name, dim, cmd.loc, cmd.desc));
      return;
    }
    case ADD_GEN: {
      const cmd = icmd.val;
      debugReport('AddGeneralLocation');
      report(executeCommandAdd(cmd.name, cmd.dim, cmd.loc, cmd.desc));
      return;
    }
    case UPD_GEN: {
      const cmd = icmd.val;
      try {
        // clone location to prevent updating the data inside the dimensionLocations
        // (if the prepareCoords / prepareDescription / updateInDb fails, the 
        // global observable state of the location db [in world an memory!] will 
        // not change)
        const loc = getDimensionLocations(cmd.dim).get(cmd.name)?.clone();
        if (loc === undefined) {
          throw new Error(`Cannot update location ${cmd.name} in ${dimString(cmd.dim)} (not found)`)
        }
        loc.prepareCoords(cmd.loc);
        if (cmd.desc !== undefined) {
          loc.prepareDescription(cmd.desc);
        } else {
          loc.unsetDescription();
        }
        loc.updateInDb();
        report(`Updated ${clrPink(cmd.name)}!`);
      } catch (e) {
        report(`Cannot udpate location ${clrPink(cmd.name)}: ${e}`);
      }
      return;
    }
    case EXP_CSV: {
      const header = `dimension;x;y;z;name;description`;
      const lines = getDimensions()
        .map(d => getDimensionLocations(d))
        .flatMap(mp => Array.from(mp.values()))
        .map(l => `${dimString(l._dimension)};${l._coords!.x};${l._coords!.y};${l._coords!.z};${l._name};${l._description === undefined ? "" : l._description}`)
        .join('\n');
      const res = `${header}\n${lines}`;
      report(`${res}\n\nExport also available in server console. (you probably cannot select text anyway :( Thanks, Microsoft )`);
      console.log(res);
      return;
    }
    default: {
      report('Unknown command!');
    }
  }
}

function bindCmdHandler() {
  world.afterEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const msg = eventData.message;
    const cmd = parseBmtpCommand(msg);
    if (cmd instanceof ParsingError) {
      player.sendMessage(new ColoredString('!', ChatColor.White).colored(ChatColor.Red, 'Error').text(`\n${cmd.msg}`).value());
    } else if (!(cmd instanceof SilentError)) {
      try {
        executeBmtpCommand(cmd, player);
      } catch (e) {
        player.sendMessage(`Error when executing command: ${e}`);
        emergency(`Error when executing command: ${e}`);
      }
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
  world.sendMessage(`DEBUG ${getDebug() ? '' : "is NOT"} enabled`);
  {
    const debugLogger = (msg: string) => console.log(msg);
    const emergencyLogger = (msg: string) => world.sendMessage(msg);
    if (getDebug()) {
      setLoggers(emergencyLogger, emergencyLogger);
      // allows handling of debug commands even if initialization fails
      bindCmdHandler();
    } else {
      setLoggers(debugLogger, emergencyLogger);
    }
  }
  initProvider(MC_BACKEND);
  const res = initialize();
  if (res !== undefined) {
    world.sendMessage(res);
    return;
  }

  if (!getDebug()) {
    bindCmdHandler();
  }
  world.sendMessage("BmTp is ready!");
}

system.run(bmtpBind);
