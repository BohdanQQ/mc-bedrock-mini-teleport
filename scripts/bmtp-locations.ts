import { world } from "@minecraft/server";
import { Coord3, McDimension, MAX_STR_LEN, NAME_REGEX, COORD_NUM_SEP, ID_SEP, DESC_REGEX } from "./bmtp-types"
import { getDimensions } from "./bmtp-mc-lib";

// hopefully never used
const LOC_DB_CURRENT_VER = 0;
const BMTP_PREFIX = "__BMTP";
const LOC_DB_PREFIX_ALL_VERSIONS = [
  BMTP_PREFIX + "1"
]
const LOC_DB_PREFIX_CURRENT_VER = LOC_DB_PREFIX_ALL_VERSIONS[LOC_DB_CURRENT_VER];
const LOCATION_ID_PREFIX = LOC_DB_PREFIX_CURRENT_VER + "LOC__";
const DESCRIPTION_ID_PREFIX = LOC_DB_PREFIX_CURRENT_VER + "DES__";

// keep it fixed to 2
const DIM_ID_LEN = 2;
/** dim to str */
function getDimensionId(dim: McDimension): string {
  switch (dim) {
    case McDimension.OVERWORLD: return "ov"
    case McDimension.NETHER: return "ne"
    case McDimension.END: return "ed"
  }
  throw new Error("Dimension not recognised");
}

/** str dim */
function getDimension(id: string): McDimension {
  switch (id) {
    case "ov": return McDimension.OVERWORLD
    case "ne": return McDimension.NETHER
    case "ed": return McDimension.END
  }
  throw new Error("Dimension id not recognised");
}

function validateRe(value: string, re: RegExp, errDescriptor: string): boolean | string {
  if (!re.test(value)) {
    return "invalid: " + errDescriptor;
  }
  return true;
}

function dbValueStringValidate(value: string, re: RegExp, errDescriptor: string): boolean | string {
  if (value.length > MAX_STR_LEN) {
    return 'invalid length of ' + errDescriptor;
  }
  return validateRe(value, re, errDescriptor);
}

function getLocationIdChecked(name: string, dim: McDimension): string {
  const checkedRes = dbValueStringValidate(name, NAME_REGEX, 'name');
  if (typeof checkedRes === 'string' || !checkedRes) {
    throw new Error("Name check failed when creating location id");
  }
  return `${LOCATION_ID_PREFIX}${getDimensionId(dim)}${ID_SEP}${name}`
}

function getDescriptionIdChecked(name: string, dim: McDimension): string {
  const checkedRes = dbValueStringValidate(name, NAME_REGEX, 'name');
  if (typeof checkedRes === 'string' || !checkedRes) {
    throw new Error("Name check failed when creating location description id");
  }
  return `${DESCRIPTION_ID_PREFIX}${getDimensionId(dim)}${ID_SEP}${name}`
}

/** @returns undefined - not recognised as ID, string - error when parsing */
function parseDimNameFromId(id: string): { dim: McDimension, name: string } | string | undefined {
  const isDesc = id.startsWith(DESCRIPTION_ID_PREFIX);
  const isLoc = id.startsWith(LOCATION_ID_PREFIX);
  if (!isDesc && !isLoc) {
    return undefined;
  }

  let dimIdEnd = 0;
  if (isDesc) {
    dimIdEnd = DESCRIPTION_ID_PREFIX.length + DIM_ID_LEN;
  } else {
    dimIdEnd = LOCATION_ID_PREFIX.length + DIM_ID_LEN;
  }
  try {
    const rv = {
      dim: getDimension(id.slice(DESCRIPTION_ID_PREFIX.length, dimIdEnd)),
      name: id.slice(dimIdEnd + ID_SEP.length)
    };

    const res = validateRe(rv.name, NAME_REGEX, 'name from DB');
    if (typeof res === 'string') {
      throw new Error(res);
    }
    return rv;
  } catch (e) {
    return `${e}`;
  }
}

function parseLocationCoords(value: string): Coord3 | undefined {
  try {
    const [x, y, z] = value.split(COORD_NUM_SEP).map(v => {
      const rv = Number(v);
      if (Number.isNaN(rv)) {
        throw new Error("Not a number");
      }
      return rv;
    });
    return {
      x, y, z
    };
  } catch {
    return undefined;
  }
}

function encodeLocationCoords(value: Coord3): string {
  return [value.x, value.y, value.z].map(toString).join(COORD_NUM_SEP);
}

function findWorldProperty(id: string): string | undefined {
  const property = world.getDynamicProperty(id);
  if (property === undefined) {
    return undefined;
  }
  else if (typeof property !== 'string') {
    throw new Error(`Unexpected property under key ${id}: ${property?.toString()} - ${typeof property}`);
  }

  return property;
}

function setWorldProperty(id: string, val: string): void {
  world.setDynamicProperty(id, val);
}

function unsetWorldProperty(id: string) {
  world.setDynamicProperty(id, undefined);
}

function isWorldPropertyNew(id: string): boolean {
  return world.getDynamicPropertyIds().find(t => t === id) === undefined;
}

export function locationFromDb(name: string, dimension: McDimension): Location | undefined {
  if (isWorldPropertyNew(getLocationIdChecked(name, dimension))) {
    return undefined;
  }

  const loc = new Location(name, dimension);
  loc.populateFromDb();
  return loc;
}

export class Location {
  _name = ""
  _dimension: McDimension = McDimension.OVERWORLD
  _coords: Coord3 | undefined
  _description: string | undefined

  constructor(name: string, dimension: McDimension, coords = undefined, description = undefined) {
    this._name = name;
    const checkedRes = dbValueStringValidate(name, NAME_REGEX, 'name');
    if (typeof checkedRes === 'string' || !checkedRes) {
      throw new Error('Location name is invalid');
    }
    this._dimension = dimension;
    this._coords = coords;
    this._description = description;
    if (description === undefined) {
      return;
    }
    this.checkDescription(description);
  }

  populateFromDb() {
    this._coords = this.getCoordinates();
    this._description = this.getDescription();
  }

  checkDescription(desc: string) {
    const checkedRes = dbValueStringValidate(desc, DESC_REGEX, 'description');
    if (typeof checkedRes === 'string' || !checkedRes) {
      throw new Error('Location description is invalid');
    }
  }

  getCoordinates(): Coord3 {
    const locationId = getLocationIdChecked(this._name, this._dimension);
    const property = findWorldProperty(locationId);
    if (property === undefined) {
      throw new Error(`Property ${locationId} not found, database malformed`);
    }

    const retVal = parseLocationCoords(property);
    if (retVal === undefined) {
      throw new Error(`Cannot parse coordinates from ${property}`);
    }
    return retVal;
  }

  getDescription(): string | undefined {
    const descId = getDescriptionIdChecked(this._name, this._dimension);
    return findWorldProperty(descId);
  }

  generateIds(): [string, string] {
    return [
      getLocationIdChecked(this._name, this._dimension),
      getDescriptionIdChecked(this._name, this._dimension)
    ];
  }

  commitToDb() {
    return this.commit_impl(false);
  }

  updateInDb() {
    return this.commit_impl(true);
  }

  commit_impl(update = false): void {
    const [locId, descId] = this.generateIds();
    if (!update && !isWorldPropertyNew(locId)) {
      throw new Error("Property ID for location is not new!");
    } else if (!update && !isWorldPropertyNew(descId)) {
      throw new Error("Property ID for description is not new!");
    }

    if (this._coords === undefined) {
      throw new Error("Cannot commit location without coordinates");
    }
    if (this._description === undefined) {
      throw new Error("Nothing to do! Nothing set/updated");
    }

    setWorldProperty(locId, encodeLocationCoords(this._coords));
    if (this._description !== undefined) {
      setWorldProperty(descId, this._description);
    }
  }

  prepareCoords(newCoords: Coord3) {
    this._coords = newCoords;
  }

  prepareDescription(newDesc: string) {
    this.checkDescription(newDesc);
    this._description = newDesc;
  }

  remove() {
    this.generateIds()
      .filter(i => !isWorldPropertyNew(i))
      .forEach(i => unsetWorldProperty(i));
  }
}

// haha i hope this is not run on multiple threads with invisible
// suspension points *_*
const locations = new Map<McDimension, Map<string, Location>>();
export function getLocations() {
  return locations;
}

export function initialize(): string | undefined {
  const allIds = world.getDynamicPropertyIds();
  const parsed = allIds
    .filter(i => i.startsWith(BMTP_PREFIX))
    .map(parseDimNameFromId)
    .filter(v => v !== undefined); // filter unrecognized

  const errReports = parsed.filter(v => typeof v === 'string');
  let errors = `INITIALIZATION encountered following ERRORS:\n` + errReports.join('\n');
  if (errReports.length > 0) {
    return errors;
  }

  for (const dim of getDimensions()) {
    locations.set(dim, new Map());
  }

  for (const { name, dim } of parsed.filter(v => typeof v !== 'string')) {
    const dimMap = locations.get(dim)!;
    try {
      const dataFromDb = locationFromDb(name, dim);
      if (dataFromDb === undefined) {
        throw new Error("cannot parse locaiton from the world property database");
      }
      dimMap.set(name, dataFromDb);
    } catch (e) {
      errors += `\n${e}`;
      return errors;
    }
  }

  return undefined;
}