
import {
  ArgDesc, ArgType, WrapMcDimension, BMTP_COMMAND_HEAD, BmTpCommand,
  Coord3, CmdDesc, Help, ListAll, ListCurrentDimension,
  parseMap, Teleport, stringToDim
} from "./bmtp-types";
import * as lib from "./bmtp-mc-lib"

const LIST_ALL_FLYWEIGHT = new ListAll();
const LIST_DIM_FLYWEIGHT = new ListCurrentDimension();
const HELP_FLYWEIGHT = new Help();

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

function isCommand(cmd: CmdDesc, candidate: string): boolean {
  return cmd.alts.find(s => s === candidate) !== undefined;
}

function validArgCountSpec(spec: CmdDesc, argCount: number) {
  return lib.getMandatoryArgCount(spec) <= argCount && argCount <= spec.argDesc.length
}

function validArgCount(candidateCmdId: string, argCount: number): boolean {
  const found = parseMap.get(candidateCmdId);
  return found !== undefined && validArgCountSpec(found, argCount);
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
    case ArgType.OptString: return val;
    case ArgType.Int:
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

function getCmdSpec(kw: string): CmdDesc | undefined {
  for (const element of parseMap.values()) {
    if (element.alts.includes(kw)) {
      return element;
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
    parsedArgs = (parsedArgs.slice(0, numberIdx));
    if (parsedArgs.slice(numberIdx).find(v => typeof v === 'number') !== undefined) {
      return new ParsingError("Unknown command structure (so far only one coordinate triplet allowed)" + `\nUsage: ${spec.usageStr}`);
    } else if (semiParsed.length <= numberIdx + 2 || typeof semiParsed[numberIdx + 1] !== 'number' || typeof semiParsed[numberIdx + 2] !== 'number') {
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
    return spec.construct(typedParsedArgs.concat((semiParsed.slice(numberIdx + 3)) as (string | WrapMcDimension)[]));
  } catch (e) {
    return new ParsingError(`Cannot construct command ${spec.alts[0]}: ${e}` + `\nUsage: ${spec.usageStr}`);
  }
}


export function parseBmtpCommand(candidate: string): ParsingError | BmTpCommand {
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
  const cmdSpecRequested = getCmdSpec(keyword);
  if (cmdSpecRequested === undefined && args.length > 1) {
    return new ParsingError(`Command ${keyword} not found`);
  } else if (cmdSpecRequested === undefined) { // length must be == 1 as < and > is checked above
    // special case, teleport command has no "keyword"
    // !tp locationName is a valid teleport command
    try {
      return new Teleport(keyword);
    } catch (e) {
      return new ParsingError(`Teleport command error: ${e}`);
    }
  }
  // ignore cmdSpec for a bit in the case of simple commands
  for (const { s, c } of [{ s: Help.name, c: HELP_FLYWEIGHT }, { s: ListCurrentDimension.name, c: LIST_DIM_FLYWEIGHT }, { s: ListAll.name, c: LIST_ALL_FLYWEIGHT },]) {
    if (isCommand(parseMap.get(s)!, keyword) && validArgCount(s, args.length - 1)) {
      return c;
    }
  }

  const cmdArgs = args.slice(1);
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