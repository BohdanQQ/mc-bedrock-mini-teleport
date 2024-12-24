
export type Coord3 = {
  x: number,
  y: number,
  z: number
};

export enum McDimension {
  OVERWORLD,
  NETHER,
  END
};

export function getDimensions(): McDimension[] {
  return [McDimension.OVERWORLD, McDimension.NETHER, McDimension.END];
}


// workaround wrapper to resolve enum clashes with the 'number' type
export class WrapMcDimension {
  dim: McDimension
  constructor(d: McDimension) {
    this.dim = d;
  }
}

export function dimString(dim: McDimension): string {
  // update stringToDim if you updated this record
  let lookup: Record<McDimension, string> = {
    [McDimension.OVERWORLD]: "Overworld",
    [McDimension.NETHER]: "Nether",
    [McDimension.END]: "End"
  };
  return lookup[dim];
}

export function stringToDim(s: string): WrapMcDimension | undefined {
  switch (s.toLowerCase()) {
    case "end": return new WrapMcDimension(McDimension.END)
    case "nether": return new WrapMcDimension(McDimension.NETHER)
    case "overworld": return new WrapMcDimension(McDimension.OVERWORLD)
  }
  return undefined;
}

export type BmTpName = string;

export type BmTpDimensionLocations = Map<BmTpName, Coord3>
export type BmTpLocationMap = Map<McDimension, BmTpDimensionLocations>;

class CmdNames {
  listAll = "list-all";
  list = "list";
  helpQ = "?";
  help = "help";
  addCurrentLoc = "add-current";
  addCoords = "add-coords";
  addDimCoords = "add-dim";
  remove = "remove";
  update = "update";
  export = "export";
};

export const LST_ALL = "listAll"
export const LST_DIM = "listDim"
export const ADD_CUR = "addCurrent"
export const ADD_DIM = "addInDim"
export const ADD_GEN = "add"
export const UPD_GEN = "update"
export const REM_GEN = "remove"
export const EXP_CSV = "exportcsv"
export const GET_HLP = "help"
export const JUST_TP = "justTp"


export const COMMANDS = [LST_ALL, LST_DIM, ADD_CUR, ADD_DIM, ADD_GEN, UPD_GEN, REM_GEN, EXP_CSV, GET_HLP, JUST_TP] as const;
export type CommandID = typeof COMMANDS[number];

export function isCmdId(s: string): boolean {
  return COMMANDS.includes(s as CommandID);
}

export function getCmdDescription(id: string): CmdDesc | undefined {
  if (!isCmdId(id)) {
    return undefined;
  }
  return cmdDescriptions[id as CommandID];
}

export const BMTP_COMMAND_HEAD: string = "!tp";
export const NAMES = new CmdNames();

export const RESERVED_NAMES = [
  NAMES.listAll, NAMES.list, NAMES.helpQ, NAMES.help,
  NAMES.addCurrentLoc, NAMES.addCoords, NAMES.addDimCoords,
  NAMES.remove, NAMES.update, NAMES.export
];

export enum ArgType {
  String, Int, OptString, Dimension
}

const OPTIONAL_ARG_TYPES = new Set([ArgType.OptString]);
export function optionalArgTypes(): Set<ArgType> {
  return OPTIONAL_ARG_TYPES;
}

export interface ArgDesc {
  name: string,
  type: ArgType
}
type ParsedArgsArr = (string | Coord3 | WrapMcDimension)[];

export interface CmdDesc {
  alts: string[];
  argDesc: ArgDesc[];
  usageStr: string;
  construct: (args: ParsedArgsArr) => BmTpCommand
}

// color coding: CMD: golden/yellow, ARGS: light green, description - gray
export function getHelpString(cmd: CmdDesc) {
  return `${BMTP_COMMAND_HEAD} \u00A76${cmd.alts.join('\u00A7f | \u00A76')}  \u00A7a${cmd.argDesc.map(i => optionalArgTypes()
    .has(i.type) ? `[ ${i.name.toUpperCase()} ]` : i.name.toUpperCase()).join('  ')
    }\u00A7f\n    \u00A77${cmd.usageStr}\u00A7f\n`;
}

export class ListAll { };

export class Help {
  getHelpString(): string {
    let res = "Usage: " + BMTP_COMMAND_HEAD + " \u00A76COMMAND\u00A7f  \u00A7aARGS  [ OPTIONAL ARGS ]\u00A7f\n";
    for (const k of COMMANDS) {
      res += getHelpString(cmdDescriptions[k]);
    }
    return res + `\nValid DIMENSION values: ` + getDimensions().map(d => `\u00A76${dimString(d)}\u00A7f`).join(', ') + ' (case insensitive)';
  }
};

export class ListCurrentDimension { };

function enforceNotReserved(vals: string[]) {
  for (const v of vals) {
    if (RESERVED_NAMES.includes(v)) {
      throw new Error(`Name ${v} is not permitted`);
    }
  }
}

export const MAX_STR_LEN = 64;
export const NAME_REGEX = new RegExp("^[0-9a-zA-Z\-]+$");
export const DESC_REGEX = new RegExp("^[0-9a-zA-Z\-]+$");
export const COORD_NUM_SEP = '_';
export const ID_SEP = '_';


function enforceStringLength(s: string) {
  if (s.length > MAX_STR_LEN) {
    throw new Error(`String too long (${s.length} vs max ${MAX_STR_LEN})`);
  }
}

function enforceLocationNameValid(s: string) {
  enforceStringLength(s);
  if (!NAME_REGEX.test(s)) {
    throw new Error(`value ${s} cannot be used as a locaiton name`);
  }
}

function enforceDescriptionValid(s: string | undefined) {
  if (s === undefined) {
    return;
  }
  enforceStringLength(s);
  if (!DESC_REGEX.test(s)) {
    throw new Error(`value ${s} cannot be used as a locaiton description`);
  }
}

export class Teleport {
  constructor(val: string) {
    enforceNotReserved([val]);
    enforceLocationNameValid(val);
    this.name = val;
  }
  name: string = ""
};

export class AddFromCurrentLocation {
  constructor(name: string, description: string | undefined) {
    enforceNotReserved([name]);
    enforceLocationNameValid(name);
    enforceDescriptionValid(description);
    this.name = name;
    this.desc = description;
  }
  name: string = "";
  desc: string | undefined = undefined;
};

export class AddFromCurrentDimension {
  constructor(name: string, location: Coord3, description: string | undefined) {
    enforceNotReserved([name]);
    enforceLocationNameValid(name);
    enforceDescriptionValid(description);
    this.name = name;
    this.loc = location;
    this.desc = description;
  }
  name: string = "";
  loc: Coord3 = { x: 0, y: 0, z: 0 };
  desc: string | undefined = undefined;
};

export class GeneralLocationOp {
  constructor(name: string, location: Coord3, dimension: McDimension, description: string | undefined) {
    enforceNotReserved([name]);
    enforceLocationNameValid(name);
    enforceDescriptionValid(description);
    this.name = name;
    this.loc = location;
    this.dim = dimension;
    this.desc = description;
  }
  name = "";
  loc: Coord3 = { x: 0, y: 0, z: 0 };
  dim = McDimension.OVERWORLD;
  desc: string | undefined = undefined;
};

export class AddGeneralLocation extends GeneralLocationOp { };
export class UpdateGeneralLocation extends GeneralLocationOp { };
export class ExportAsSCSV { };
export class RemoveLocation {
  constructor(name: string, dimension: McDimension) {
    enforceNotReserved([name]);
    enforceLocationNameValid(name);
    this.name = name;
    this.dim = dimension;
  }
  name: string = "";
  dim = McDimension.OVERWORLD;
};

function valueOrUndefined<T>(index: number, source: any[]): (T | undefined) {
  if (index >= source.length) {
    return undefined;
  }
  return source[index] as T;
}

const LIST_ALL_FLYWEIGHT = new ListAll();
const LIST_DIM_FLYWEIGHT = new ListCurrentDimension();
const HELP_FLYWEIGHT = new Help();
const EXPORT_FLYWEIGHT = new ExportAsSCSV();


/** Command descriptions for the parser
 * Due to the current parsing implementation, optional args MUST be at the tail
 * and MUST be considered eagerly evaluated 
 * (optInt optStr with value "stringValue" fails) 
 * Also, the order of argDesc and the arguments of construct fucntion must correspond 
 */
export const cmdDescriptions: Record<CommandID, CmdDesc> = {
  [JUST_TP]: {
    alts: [],
    argDesc: [{ name: "name", type: ArgType.String }],
    usageStr: "teleports you within your current dimension",
    construct: ([name]: ParsedArgsArr) => new Teleport(name as string)
  },
  [LST_ALL]: {
    alts: [NAMES.listAll],
    argDesc: [],
    usageStr: "lists all locations in all dimensions",
    construct: () => LIST_ALL_FLYWEIGHT
  },
  [GET_HLP]: {
    alts: [NAMES.help, NAMES.helpQ],
    argDesc: [],
    usageStr: "prints out this help",
    construct: () => HELP_FLYWEIGHT
  },
  [LST_DIM]: {
    alts: [NAMES.list],
    argDesc: [],
    usageStr: "lists all locations in this dimension",
    construct: () => LIST_DIM_FLYWEIGHT
  },
  [EXP_CSV]: {
    alts: [NAMES.export],
    argDesc: [],
    usageStr: "prints semicolon-separated 'CSV' table of all locations",
    construct: () => EXPORT_FLYWEIGHT
  },
  [ADD_CUR]: {
    alts: [NAMES.addCurrentLoc],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "description", type: ArgType.OptString }],
    usageStr: "adds your current player location under a name and a description",
    construct: ([name, ...rest]: ParsedArgsArr) => new AddFromCurrentLocation(name as string, valueOrUndefined(0, rest))
  },
  [ADD_DIM]: {
    alts: [NAMES.addCoords],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "adds specified location within your current dimension under a name and a description",
    construct: ([name, loc, ...rest]: ParsedArgsArr) => new AddFromCurrentDimension(name as string, loc as Coord3, valueOrUndefined(0, rest))
  },
  [ADD_GEN]: {
    alts: [NAMES.addDimCoords],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "dimension", type: ArgType.Dimension }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "adds specified location within the specified dimension under a name and a description",
    construct: ([name, dim, loc, ...rest]: ParsedArgsArr) => new AddGeneralLocation(name as string, loc as Coord3, (dim as WrapMcDimension).dim, valueOrUndefined(0, rest))
  },
  [UPD_GEN]: {
    alts: [NAMES.update],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "dimension", type: ArgType.Dimension }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "updates the coordinates and description of a location specified by name and dimension (dimension cannot be changed, instead remove and re-add the entry)",
    construct: ([name, dim, loc, ...rest]: ParsedArgsArr) => new UpdateGeneralLocation(name as string, loc as Coord3, (dim as WrapMcDimension).dim, valueOrUndefined(0, rest))
  },
  [REM_GEN]: {
    alts: [NAMES.remove],
    argDesc: [{ name: "dimension", type: ArgType.Dimension }, { name: "name", type: ArgType.String }],
    usageStr: "removes the specified location within the specified dimension FOREVER",
    construct: ([dim, name]: ParsedArgsArr) => new RemoveLocation(name as string, (dim as WrapMcDimension).dim)
  }
};

function sanityCheck() /* of the parseMap (for duplicates) */ {
  let nameSet = new Set<String>();
  for (const k of COMMANDS) {
    const val = cmdDescriptions[k];
    val.alts.forEach(v => {
      if (nameSet.has(v)) {
        throw new Error("Cannot initialize - name conflict in commands: " + v);
      }
      nameSet.add(v);
    });

    let argNames = new Set<String>();
    val.argDesc.forEach(v => {
      if (argNames.has(v.name)) {
        throw new Error("Cannot intialize - argument name conflict for command " + val.alts)
      }
      argNames.add(v.name);
    });
  }
}

sanityCheck();

// this could be a discriminated union interface
/**
 * interface BmTpCommand = { cmd : { type: 'LSTALL', val: ListAll } | { type: 'LSTCURR', val: ListCurrentDimension } | ... }
 * but the conversion is somewhat costly and right now the instanceof checks are sufficient, maybe for a more robust system of command parsing?
 */
export type BmTpCommand = ListAll | ListCurrentDimension | Help | Teleport | AddGeneralLocation | RemoveLocation | UpdateGeneralLocation | AddFromCurrentDimension | AddFromCurrentLocation | ExportAsSCSV;
