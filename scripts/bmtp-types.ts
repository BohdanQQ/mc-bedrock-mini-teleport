export type Coord3 = {
  x: number,
  y: number,
  z: number
};

export enum McDimensions {
  OVERWORLD,
  NETHER,
  END
};

export function dimString(dim: McDimensions): string {
  switch (dim) {
    case McDimensions.END: return "End"
    case McDimensions.NETHER: return "Nether"
    case McDimensions.OVERWORLD: return "Overworld"
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
export type BmTpLocationMap = Map<McDimensions, BmTpDimensionLocations>;

export const BMTP_COMMAND_HEAD: string = "!tp";