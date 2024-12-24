import { Coord3, McDimension, MAX_STR_LEN, NAME_REGEX, COORD_NUM_SEP, ID_SEP, DESC_REGEX, dimString, getDimensions } from "./bmtp-types"
import { DataProvider, getProvider } from "./bmtp-data-providers"
import { emergency } from "./bmtp-mc-lib";

let backend: DataProvider | undefined;

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
  // update getDimension if you updated this record
  const lookup: Record<McDimension, string> = {
    [McDimension.OVERWORLD]: "ov",
    [McDimension.NETHER]: "ne",
    [McDimension.END]: "ed"
  }
  return lookup[dim];
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
  return [value.x, value.y, value.z].map(v => v.toString()).join(COORD_NUM_SEP);
}

function setWorldProperty(id: string, val: string): void {
  backend?.set(id, val);
}

function unsetWorldProperty(id: string): void {
  backend?.get(id)?.unset();
}

function isWorldPropertyNew(id: string): boolean {
  return backend?.knownKeys().find(t => t === id) === undefined;
}

export function locationFromDb(name: string, dimension: McDimension): Location | undefined {
  if (isWorldPropertyNew(getLocationIdChecked(name, dimension))) {
    return undefined;
  }

  const loc = new Location(name, dimension);
  loc.populateFromDb();
  return loc;
}

function forceReloadIfInconsistent(criterion: unknown, helpStr: string) {
  if (criterion === undefined) { // MUST always throw if criterion undefined
    emergency("ERROR: Inner Location Database is inconistent, reloading!\nCause: " + helpStr);
    const res = initialize();
    throw new Error("Inner Location Database is inconistent, reloaded with " + res === undefined ? "no error" : res);
  }
}

function normalizeCoords(c: Coord3): Coord3 {
  return { x: Math.floor(c.x), y: Math.floor(c.y), z: Math.floor(c.z) };
}

export class Location {
  _name = ""
  _dimension: McDimension = McDimension.OVERWORLD
  _coords: Coord3 | undefined
  _description: string | undefined

  constructor(name: string, dimension: McDimension, coords: Coord3 | undefined = undefined, description: string | undefined = undefined) {
    this._name = name;
    const checkedRes = dbValueStringValidate(name, NAME_REGEX, 'name');
    if (typeof checkedRes === 'string' || !checkedRes) {
      throw new Error('Location name is invalid');
    }
    this._dimension = dimension;
    if (coords !== undefined) {
      this._coords = normalizeCoords(coords);
    } else {
      this._coords = coords;
    }
    this._description = description;
    if (description === undefined) {
      return;
    }
    this.checkDescription(description);
  }

  populateFromDb() {
    this._coords = normalizeCoords(this.getCoordinates());
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
    const property = backend?.get(locationId);
    forceReloadIfInconsistent(property, `${locationId} not found in getCoordinates`);
    forceReloadIfInconsistent(property!.value(), `${locationId} location ID has undefined value`);
    // safety: forceReloadIfInconsistent throws if property is undefined
    const retVal = parseLocationCoords(property!.value()!);
    if (retVal === undefined) {
      throw new Error(`Cannot parse coordinates from ${property}`);
    }
    return retVal;
  }

  getDescription(): string | undefined {
    const descId = getDescriptionIdChecked(this._name, this._dimension);
    return backend?.get(descId)?.value();
  }

  generateIds(): [string, string] {
    return [
      getLocationIdChecked(this._name, this._dimension),
      getDescriptionIdChecked(this._name, this._dimension)
    ];
  }

  commitToDb() {
    this.commit_impl(false);
  }

  updateInDb() {
    this.commit_impl(true);
  }

  commit_impl(update = false): void {
    const [locId, descId] = this.generateIds();
    if (!update && !isWorldPropertyNew(locId)) {
      throw new Error(`Location name and dimension combination (${this._name} ${dimString(this._dimension)}) already exists!`);
    } else if (!update && !isWorldPropertyNew(descId)) {
      throw new Error(`Location dimension and name combination (${dimString(this._dimension)} ${this._name}) already exists!`);
    }

    if (this._coords === undefined || this._coords.x === undefined || this._coords.y === undefined || this._coords.z === undefined) {
      throw new Error("Cannot commit location without (any one of the) coordinates");
    }

    setWorldProperty(locId, encodeLocationCoords(this._coords));
    if (this._description !== undefined) {
      setWorldProperty(descId, this._description);
    }

    forceReloadIfInconsistent(locations.get(this._dimension)?.set(this._name, this), 'commit_impl');
  }

  prepareCoords(newCoords: Coord3) {
    this._coords = normalizeCoords(newCoords);
  }

  prepareDescription(newDesc: string) {
    this.checkDescription(newDesc);
    this._description = newDesc;
  }

  remove() {
    this.generateIds()
      .filter(i => !isWorldPropertyNew(i))
      .forEach(i => unsetWorldProperty(i));
    forceReloadIfInconsistent(locations.get(this._dimension)?.delete(this._name), 'remove');
  }
}

// haha i hope this is not run on multiple threads with invisible
// suspension points *_*
const locations = new Map<McDimension, Map<string, Location>>();


export function getDimensionLocations(dim: McDimension): Map<string, Location> {
  return locations.get(dim)!;
}

export function NEVERUSE_PURGE_ALL() {
  backend?.knownKeys()
    .filter(i => i.startsWith(BMTP_PREFIX))
    .forEach(v => unsetWorldProperty(v));
}

export function debugInspectProperties(): string {
  return backend!.knownKeys()
    .filter(i => i.startsWith(BMTP_PREFIX))
    .map(v => `${v}  :  ${backend?.get(v)?.value()}`)
    .join('\n');
}
let intializationCount = 0;

export function initialize(): string | undefined {
  backend = getProvider()!;
  intializationCount += 1;
  if (intializationCount > 2) {
    throw new Error("Unrecoverable error");
  }
  const allIds = backend.knownKeys();
  const parsed = allIds
    .filter(i => i.startsWith(BMTP_PREFIX))
    .map(v => parseDimNameFromId(v))
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