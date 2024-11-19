
import { BMTP_COMMAND_HEAD, BmTpCommand, BmTpName, Command, HelpAll, HelpCurrentDimension, Teleport } from "./bmtp-types";

const HELP_ALL_FLYWEIGHT = new HelpAll();
const HELP_DIM_FLYWEIGHT = new HelpCurrentDimension();

function bmtpIsValidCandidate(candidate: string): boolean {
  return candidate.startsWith(BMTP_COMMAND_HEAD);
}

function isCommand(cmd: Command, candidate: string): boolean {
  return cmd.alts.find(s => s === candidate) != undefined;
}

export function parseBmtpCommand(candidate: string): null | BmTpCommand {
  if (!bmtpIsValidCandidate(candidate)) {
    return null;
  }

  const split = candidate.split(' ');
  if (split.length < 2) {
    return null;
  }


  const args = split.slice(1);
  if (args.length != 1) {
    return null;
  }

  const arg = args[0];

  for (const cmd of [HELP_ALL_FLYWEIGHT, HELP_DIM_FLYWEIGHT]) {
    if (isCommand(cmd, arg)) {
      return cmd;
    }
  }

  return new Teleport(arg);
}