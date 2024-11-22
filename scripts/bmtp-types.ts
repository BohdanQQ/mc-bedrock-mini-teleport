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

export function dimString(dim: McDimension): string {
  switch (dim) {
    case McDimension.END: return "End"
    case McDimension.NETHER: return "Nether"
    case McDimension.OVERWORLD: return "Overworld"
  }
}
export interface Command {
  alts: string[];
}

export class HelpAll implements Command {
  alts = ["help-all"]
};

export class HelpCurrentDimension implements Command {
  alts = ["help", "?"]
}

export class Teleport {
  constructor(val: string) {
    this.value = val;
  }
  value: string = ""
}

export type BmTpName = string;
export type BmTpCommand = HelpAll | HelpCurrentDimension | Teleport;

export type BmTpDimensionLocations = Map<BmTpName, Coord3>
export type BmTpLocationMap = Map<McDimension, BmTpDimensionLocations>;

export const BMTP_COMMAND_HEAD: string = "!tp";
