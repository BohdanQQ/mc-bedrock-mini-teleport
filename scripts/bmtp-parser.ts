
import {
  ArgDesc, ArgType, WrapMcDimension, BMTP_COMMAND_HEAD, BmTpCommand,
  Coord3, CmdDesc,
  cmdDescriptions, stringToDim,
  COMMANDS
} from "./bmtp-types";
import * as lib from "./bmtp-mc-lib"

export class ParsingError {
  msg = ""
  constructor(msg: string) {
    this.msg = msg;
  }
}

export class SilentError { }

function bmtpIsValidCandidate(candidate: string): boolean {
  return candidate.startsWith(BMTP_COMMAND_HEAD);
}

function validArgCountSpec(spec: CmdDesc, argCount: number) {
  return lib.getMandatoryArgCount(spec) <= argCount && argCount <= spec.argDesc.length
}

function validateArguments(cmdSpec: CmdDesc, args: string[]): ParsingError | boolean {
  if (!validArgCountSpec(cmdSpec, args.length)) {
    return new ParsingError("Invalid argument count");
  }
  const validation = args.map((v, i) => validateArg(v, cmdSpec.argDesc[i]));
  if (validation.every(v => typeof v === 'boolean' && v)) {
    return true;
  }
  return validation.find(v => typeof v !== 'boolean') as ParsingError;
}

function validateArg(val: string, desc: ArgDesc): ParsingError | boolean {
  try {
    parseArg(val, desc);
    return true;
  } catch (e) {
    return new ParsingError(`Cannot parse ${desc.name}: ${e}`);
  }
}

export function parseArg(val: string, desc: ArgDesc): string | number | WrapMcDimension {
  switch (desc.type) {
    case ArgType.String: return val;
    case ArgType.Int:
      // eslint-disable-next-line no-case-declarations
      const res = Number(val);
      if (Number.isNaN(res)) {
        throw new Error(`${val} passed as argument ${desc.name} is not a number`);
      }
      return Number(val);
    case ArgType.Dimension: {
      const v = stringToDim(val);
      if (v === undefined) {
        throw new Error(`${val} is not a valid dimension specifier`);
      }
      return v;
    }
  }
}

function getCmdSpecForAltNameMatch(altName: string): CmdDesc | undefined {
  for (const k of COMMANDS) {
    if (cmdDescriptions[k].alts.includes(altName)) {
      return cmdDescriptions[k];
    }
  }
  return undefined;
}

function tryParseCommand(spec: CmdDesc, args: string[]): ParsingError | BmTpCommand {
  let semiParsed;
  try {
    semiParsed = args.map((argStr, i) => parseArg(argStr, spec.argDesc[i]));
  } catch (e) {
    return new ParsingError(`Cannot parse: ${e}` + `\nUsage: ${spec.usageStr}`);
  }

  let parsedArgs = semiParsed;
  let typedParsedArgs;
  const numberIdx = semiParsed.findIndex(o => typeof o === 'number');
  if (numberIdx !== -1) {
    // this branch collapses coordinate triplets in arguments (sequence of 3 numbers) into Coord3
    // right now it only collapses the first occurence
    // TODO: collapse greedily all coordinate triplets from left to right
    parsedArgs = (parsedArgs.slice(0, numberIdx)); // elements up to (excluding) the first number inthe sequence of args
    if (semiParsed.length <= numberIdx + 2 || typeof semiParsed[numberIdx + 1] !== 'number' || typeof semiParsed[numberIdx + 2] !== 'number') {
      return new ParsingError("Inconsistent parsing, expected coordinate triplet." + `\nUsage: ${spec.usageStr}`);
    }
    typedParsedArgs = parsedArgs as (string | Coord3 | WrapMcDimension)[];
    if (numberIdx !== -1) {
      typedParsedArgs.push({
        x: semiParsed[numberIdx] as number,
        y: semiParsed[numberIdx + 1] as number,
        z: semiParsed[numberIdx + 2] as number,
      });
    }
  } else {
    typedParsedArgs = parsedArgs as (string | WrapMcDimension)[];
  }

  try {
    // the result becomes the sliced version of arguments + [ optionaly coordinates - previous branch ] + the rest of the arguments 
    return spec.construct(typedParsedArgs.concat((semiParsed.slice(numberIdx + 3)) as (string | WrapMcDimension)[]));
  } catch (e) {
    return new ParsingError(`Cannot construct command ${spec.alts[0]}: ${e}` + `\nUsage: ${spec.usageStr}`);
  }
}

function implCommandParsing(cmdSpecRequested: CmdDesc, cmdArgs: string[]): ParsingError | BmTpCommand {
  const validationResult = validateArguments(cmdSpecRequested, cmdArgs);
  if (validationResult instanceof ParsingError) {
    return validationResult;
  }

  try {
    return tryParseCommand(cmdSpecRequested, cmdArgs);
  } catch (e) {
    return new ParsingError(`Unable to construct command ${cmdSpecRequested.alts[0]}: ${e}`);
  }
}


export function parseBmtpCommand(candidate: string): SilentError | ParsingError | BmTpCommand {
  if (!bmtpIsValidCandidate(candidate)) {
    return new SilentError();
  }

  const split = candidate.split(' ').filter(s => s.length > 0);
  if (split.length < 2 || split[0] !== BMTP_COMMAND_HEAD) {
    return new ParsingError("Invalid command format");
  }


  const args = split.slice(1);
  if (args.length < 1) {
    return new ParsingError("Not enough arguments");
  }

  const keyword = args[0];
  // due to the syntax of the teleportation command, we first check for a valid
  // !tp <locaiton> command and then try other commands
  const cmdSpecRequested = getCmdSpecForAltNameMatch(keyword);
  const tpCommandParseAttempt = implCommandParsing(cmdDescriptions.justTp, args);
  if (cmdSpecRequested === undefined && tpCommandParseAttempt instanceof ParsingError) {
    return new ParsingError(`Command ${keyword} not found (${tpCommandParseAttempt.msg})`);
  } else if (cmdSpecRequested === undefined) {
    return tpCommandParseAttempt;
  }

  const cmdArgs = args.slice(1);
  return implCommandParsing(cmdSpecRequested, cmdArgs);
}