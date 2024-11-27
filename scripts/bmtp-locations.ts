import { world } from "@minecraft/server";
import { Coord3, McDimension, MAX_STR_LEN, NAME_REGEX, COORD_NUM_SEP, DESC_REGEX } from "./bmtp-types"

// hopefully never used
const LOC_DB_CURRENT_VER = 1;
const LOC_DB_PREFIX_ALL_VERSIONS = [
  "__BMTP1"
]
const LOC_DB_PREFIX_CURRENT_VER = LOC_DB_PREFIX_ALL_VERSIONS[LOC_DB_CURRENT_VER];
const LOCATION_ID_PREFIX = LOC_DB_PREFIX_CURRENT_VER + "LOC__";
const DESCRIPTION_ID_PREFIX = LOC_DB_PREFIX_CURRENT_VER + "DES__";

function getDimensionId(dim: McDimension): string {
  switch (dim) {
    case McDimension.OVERWORLD: return "ov"
    case McDimension.NETHER: return "ne"
    case McDimension.END: return "ed"
  }
  throw new Error("Dimension not recognised");
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
  return `${LOCATION_ID_PREFIX}${getDimensionId(dim)}_${name}`
}

function getDescriptionIdChecked(name: string, dim: McDimension): string {
  const checkedRes = dbValueStringValidate(name, NAME_REGEX, 'name');
  if (typeof checkedRes === 'string' || !checkedRes) {
    throw new Error("Name check failed when creating location description id");
  }
  return `${DESCRIPTION_ID_PREFIX}${getDimensionId(dim)}_${name}`
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