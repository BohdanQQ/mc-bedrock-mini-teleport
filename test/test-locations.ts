import { testRunner } from './test-lib';
import { initProvider } from '../scripts/bmtp-data-providers';
import { initialize, Location, locationFromDb } from '../scripts/bmtp-locations';
import { resetData, TEST_BACKEND } from '../scripts/data-stores/test';
import { Coord3, McDimension } from '../scripts/bmtp-types';
import { setQuietMode } from '../scripts/bmtp-mc-lib';

function beforeEveryTest() {
  resetData();
}

function makeTest(fn: () => void) {
  return () => {
    beforeEveryTest();
    fn();
  }
}

function coordsEq(c: Coord3, c2: Coord3): boolean {
  return c.x === c2.x && c.y === c2.y && c.z === c2.z;
}

function updateAndRetrieve(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return () => {
    try {
      insertAndRetrieveCase(n, d, c, desc)();
      console.log("Inconsistent, expected duplicate value to be updated, instead normal commit succeeded");
      return false;
    } catch {
      new Location(n, d, c, desc).updateInDb();
      const val = locationFromDb(n, d);
      if (val === undefined || val._coords === undefined) {
        return false;
      }
      return val._name === n && val._dimension === d && coordsEq(val._coords, c) && val._description == desc;
    }
  }
}

function insertAndRetrieveCase(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return () => {
    new Location(n, d, c, desc).commitToDb();
    const val = locationFromDb(n, d);
    if (val === undefined || val._coords === undefined) {
      return false;
    }
    return val._name === n && val._dimension === d && coordsEq(val._coords, c) && val._description == desc;
  }
}

function TESTinsert() {
  const ok = [
    ["just commit", () => {
      new Location("xd", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }).commitToDb();
      return true
    }],
    ["commited info can be recalled (no desc)", insertAndRetrieveCase("xd2", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, undefined)],
    ["commited info can be recalled", insertAndRetrieveCase("xd3", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, "my-desc")],
  ];
  testRunner('commit', ok, []);
}

function setupTestUpdate(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  new Location(name, d, c, desc).commitToDb();
}

function getTestForDescVal(name: string, val: undefined | string, body: (name: string, d: McDimension, c: Coord3, desc: undefined | string) => void) {
  return () => {
    setupTestUpdate(name, McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, val)
    body(name, McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, val);
  }
}

function locationUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  const ok = [
    ["REcommit is consistent (coord)", updateAndRetrieve(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc)],
    ["REcommit is consistent (coord second same)", updateAndRetrieve(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc)],
    ["REcommit is consistent (coord third)", updateAndRetrieve(name, d, { x: c.x + 3, y: c.y, z: c.z }, desc)],
  ];
  testRunner('commit ' + name, ok, []);
}

function dimUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  const ok = [
    ["REcommit is consistent (dim)", () => !updateAndRetrieve(name, (d == McDimension.END ? McDimension.OVERWORLD : McDimension.END), c, desc)],
    ["REcommit is consistent (dim same)", () => !updateAndRetrieve(name, (d == McDimension.END ? McDimension.OVERWORLD : McDimension.END), c, desc)],
    ["REcommit is consistent (dim new)", () => !updateAndRetrieve(name, (d == McDimension.END ? McDimension.END : McDimension.NETHER), c, desc)],
  ];
  testRunner('commit ' + name, ok, []);
}

function descUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  const ok = [
    ["REcommit is consistent (desc)", updateAndRetrieve(name, d, c, desc === undefined ? "myDescxd" : undefined)],
    ["REcommit is consistent (desc same)", updateAndRetrieve(name, d, c, desc === undefined ? "myDescxd" : undefined)],
    ["REcommit is consistent (desc new)", updateAndRetrieve(name, d, c, "myDescxd2")],
  ];
  testRunner('commit ' + name, ok, []);
}

function allUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  const ok = [
    ["REcommit is consistent (all)", updateAndRetrieve(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc === undefined ? "myDescxd" : undefined)],
    ["REcommit is consistent (all same)", updateAndRetrieve(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc === undefined ? "myDescxd" : undefined)],
    ["REcommit is consistent (all new)", updateAndRetrieve(name, d, { x: c.x + 3, y: c.y, z: c.z }, "myDescxd2")],
  ];
  testRunner('commit ' + name, ok, []);
}


export function locationsSuite() {
  setQuietMode(true);
  initProvider(TEST_BACKEND);
  if (initialize() !== undefined) {
    throw new Error("Failed to initialize the test environment! SOME TESTS DID NOT RUN");
  }
  makeTest(TESTinsert)();
  makeTest(getTestForDescVal('location-update-1', undefined, locationUpdateTest))();
  makeTest(getTestForDescVal('location-update-2', 'mydesc', locationUpdateTest))();
  makeTest(getTestForDescVal('dim-update-1', undefined, dimUpdateTest))();
  makeTest(getTestForDescVal('dim-update-2', 'mydesc', dimUpdateTest))();
  makeTest(getTestForDescVal('desc-update-1', undefined, descUpdateTest))();
  makeTest(getTestForDescVal('desc-update-2', 'mydesc', descUpdateTest))();
  makeTest(getTestForDescVal('all-update-1', undefined, allUpdateTest))();
  makeTest(getTestForDescVal('all-update-2', 'mydesc', allUpdateTest))();
  setQuietMode(false);
}
