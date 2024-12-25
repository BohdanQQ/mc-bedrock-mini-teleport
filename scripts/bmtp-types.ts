import { ChatColor, ColoredString } from "./bmtp-lib";

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

// workaround wrapper to resolve enum clashes with the 'number' type (coordinates VS dimension passing into constructors/parsing)
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


export const COMMANDS = [JUST_TP, LST_DIM, GET_HLP, LST_ALL, ADD_CUR, ADD_DIM, ADD_GEN, UPD_GEN, REM_GEN, EXP_CSV] as const;
export type CommandID = typeof COMMANDS[number];

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
  const text = new ColoredString('', ChatColor.White).text(`${BMTP_COMMAND_HEAD} `)
    .toggleColor(ChatColor.Gold)
    .text(cmd.alts.join(`${ChatColor.White} | ${ChatColor.Gold}`))
    .toggleColor(ChatColor.Green);
  const args = cmd.argDesc.map(i => optionalArgTypes()
    .has(i.type) ? `[ ${i.name.toUpperCase()} ]` : i.name.toUpperCase()).join('  ')
  text.text(`${cmd.alts.length == 0 ? '' : ' '}${args}`);
  text.resetColor();
  text.colored(ChatColor.Gray, `\n    ${cmd.usageStr}\n`);
  return text.value();
}

export class ListAll { };

export class Help {
  getHelpString(): string {
    let res = new ColoredString(' ', ChatColor.White).text('Usage:').text(BMTP_COMMAND_HEAD).colored(ChatColor.Gold, 'COMMAND').colored(ChatColor.Green, 'ARGS [ OPTIONAL ARGS ]\n\n').resetColor();
    for (const k of COMMANDS) {
      res.text(getHelpString(cmdDescriptions[k])).resetColor();
    }
    res.text('\nPossible').colored(ChatColor.Green, 'DIMENSION').text('values:').text(getDimensions().map(d => `${ChatColor.Gold}${dimString(d)}${ChatColor.White}`).join(', '))
      .text('(case insensitive)');
    return res.value();
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

export class AddFromCurrentDimension extends AddFromCurrentLocation {
  constructor(name: string, location: Coord3, description: string | undefined) {
    super(name, description);
    this.loc = location;
  }
  loc: Coord3 = { x: 0, y: 0, z: 0 };
};

export class GeneralLocationOp extends AddFromCurrentDimension {
  constructor(name: string, location: Coord3, dimension: McDimension, description: string | undefined) {
    super(name, location, description);
    this.dim = dimension;
  }
  dim = McDimension.OVERWORLD;
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

type CmdValueType = AddFromCurrentDimension | AddFromCurrentLocation | RemoveLocation | ListAll | ListCurrentDimension | Help | AddGeneralLocation | UpdateGeneralLocation | ListCurrentDimension;
export function cmdCtor(cmdId: CommandID, cmd: CmdValueType): BmTpCommand {
  // havent found better way to keep the syntax clutter from construction of tagged unions away from actual code
  switch (cmdId) {
    case LST_ALL:
      return { cmd: { type: LST_ALL, val: cmd as ListAll } };
    case LST_DIM:
      return { cmd: { type: LST_DIM, val: cmd as ListCurrentDimension } };
    case GET_HLP:
      return { cmd: { type: GET_HLP, val: cmd as Help } };
    case ADD_CUR:
      return { cmd: { type: ADD_CUR, val: cmd as AddFromCurrentLocation } };
    case ADD_DIM:
      return { cmd: { type: ADD_DIM, val: cmd as AddFromCurrentDimension } };
    case ADD_GEN:
      return { cmd: { type: ADD_GEN, val: cmd as AddGeneralLocation } };
    case UPD_GEN:
      return { cmd: { type: UPD_GEN, val: cmd as UpdateGeneralLocation } };
    case REM_GEN:
      return { cmd: { type: REM_GEN, val: cmd as RemoveLocation } };
    case EXP_CSV:
      return { cmd: { type: EXP_CSV, val: cmd as ExportAsSCSV } };
    case JUST_TP:
      return { cmd: { type: JUST_TP, val: cmd as Teleport } };
    default:
      throw new Error(`Unknown command ID: ${cmdId}`);
  }
}

const LIST_ALL_FLYWEIGHT = cmdCtor(LST_ALL, new ListAll());
const LIST_DIM_FLYWEIGHT = cmdCtor(LST_DIM, new ListCurrentDimension());
const HELP_FLYWEIGHT = cmdCtor(GET_HLP, new Help());
const EXPORT_FLYWEIGHT = cmdCtor(EXP_CSV, new ExportAsSCSV());


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
    construct: ([name]: ParsedArgsArr) => cmdCtor(JUST_TP, new Teleport(name as string))
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
    construct: ([name, ...rest]: ParsedArgsArr) => cmdCtor(ADD_CUR, new AddFromCurrentLocation(name as string, valueOrUndefined(0, rest)))
  },
  [ADD_DIM]: {
    alts: [NAMES.addCoords],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "adds specified location within your current dimension under a name and a description",
    construct: ([name, loc, ...rest]: ParsedArgsArr) => cmdCtor(ADD_DIM, new AddFromCurrentDimension(name as string, loc as Coord3, valueOrUndefined(0, rest)))
  },
  [ADD_GEN]: {
    alts: [NAMES.addDimCoords],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "dimension", type: ArgType.Dimension }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "adds specified location within the specified dimension under a name and a description",
    construct: ([name, dim, loc, ...rest]: ParsedArgsArr) => cmdCtor(ADD_GEN, new AddGeneralLocation(name as string, loc as Coord3, (dim as WrapMcDimension).dim, valueOrUndefined(0, rest)))
  },
  [UPD_GEN]: {
    alts: [NAMES.update],
    argDesc: [{ name: "name", type: ArgType.String }, { name: "dimension", type: ArgType.Dimension }, { name: "x", type: ArgType.Int }, { name: "y", type: ArgType.Int }, { name: "z", type: ArgType.Int }, { name: "description", type: ArgType.OptString }],
    usageStr: "updates the coordinates and description of a location specified by name and dimension (dimension cannot be changed, instead remove and re-add the entry)",
    construct: ([name, dim, loc, ...rest]: ParsedArgsArr) => cmdCtor(UPD_GEN, new UpdateGeneralLocation(name as string, loc as Coord3, (dim as WrapMcDimension).dim, valueOrUndefined(0, rest)))
  },
  [REM_GEN]: {
    alts: [NAMES.remove],
    argDesc: [{ name: "dimension", type: ArgType.Dimension }, { name: "name", type: ArgType.String }],
    usageStr: "removes the specified location within the specified dimension FOREVER",
    construct: ([dim, name]: ParsedArgsArr) => cmdCtor(REM_GEN, new RemoveLocation(name as string, (dim as WrapMcDimension).dim))
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

export interface BmTpCommand {
  cmd:
  { type: typeof LST_ALL, val: ListAll } |
  { type: typeof LST_DIM, val: ListCurrentDimension } |
  { type: typeof GET_HLP, val: Help } |
  { type: typeof ADD_CUR, val: AddFromCurrentLocation } |
  { type: typeof ADD_DIM, val: AddFromCurrentDimension } |
  { type: typeof ADD_GEN, val: AddGeneralLocation } |
  { type: typeof UPD_GEN, val: UpdateGeneralLocation } |
  { type: typeof REM_GEN, val: RemoveLocation } |
  { type: typeof EXP_CSV, val: ExportAsSCSV } |
  { type: typeof JUST_TP, val: Teleport }
};