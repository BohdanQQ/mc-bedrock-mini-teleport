import { testRunner } from './test-lib';
import { initProvider } from '../scripts/bmtp-data-providers';
import { getDimensionLocations, initialize, Location, NEVERUSE_locationFromDb as locationFromDb, NEVERUSE_PURGE_ALL } from '../scripts/bmtp-locations';
import { resetData, TEST_BACKEND } from '../scripts/data-stores/test';
import { Coord3, McDimension } from '../scripts/bmtp-types';
import { setQuietMode } from '../scripts/bmtp-mc-lib';

function beforeEveryTest() {
  resetData();
  NEVERUSE_PURGE_ALL();
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

function updateAndRetrieveCaseFactory(n: string, d: McDimension, c: Coord3, desc: undefined | string, valGetter: (n: string, d: McDimension) => undefined | Location) {
  return () => {
    try {
      insertAndRetrieveCase(n, d, c, desc)();
      console.log("Warning, expected duplicate value to be updated, instead normal commit succeeded");
      return false;
    } catch {
      new Location(n, d, c, desc).updateInDb();
      const val = valGetter(n, d);
      if (val === undefined || val._coords === undefined) {
        return false;
      }
      return val._name === n && val._dimension === d && coordsEq(val._coords, c) && val._description == desc;
    }
  }
}

function updateAndRetrieveCase(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return updateAndRetrieveCaseFactory(n, d, c, desc, locationFromDb);
}
function updateAndRetrieveCoherentCase(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return updateAndRetrieveCaseFactory(n, d, c, desc, (a, b) => getDimensionLocations(b).get(a));
}

function insertAndRetrieveCaseFactory(n: string, d: McDimension, c: Coord3, desc: undefined | string, valGetter: (n: string, d: McDimension) => undefined | Location) {
  return () => {
    new Location(n, d, c, desc).commitToDb();
    const val = valGetter(n, d);
    if (val === undefined || val._coords === undefined) {
      return false;
    }
    return val._name === n && val._dimension === d && coordsEq(val._coords, c) && val._description == desc;
  }
}

function insertAndRetrieveCase(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return insertAndRetrieveCaseFactory(n, d, c, desc, locationFromDb);
}

function insertAndRetrieveCoherentCase(n: string, d: McDimension, c: Coord3, desc: undefined | string) {
  return insertAndRetrieveCaseFactory(n, d, c, desc, (a, b) => getDimensionLocations(b).get(a));
}

type CaseGenT = (n: string, d: McDimension, c: Coord3, desc: undefined | string) => (() => boolean);

function insertTestBodyGen(name: string, caseFn: CaseGenT) {
  return () => {
    const ok = [
      ["just commit", () => {
        new Location("xd", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }).commitToDb();
        return true
      }],
      ["commited info can be recalled (no desc)", okTest(caseFn("xd2", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, undefined))],
      ["commited info can be recalled", okTest(caseFn("xd3", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, "my-desc"))],
    ];
    testRunner(name, ok, []);
  }
}

function TESTinsert() {
  insertTestBodyGen('commit-db', insertAndRetrieveCase)();
}

function TESTinsertCoherence() {
  insertTestBodyGen('commit-coherence', insertAndRetrieveCoherentCase)();
}

function setupTestUpdate(name: string, d: McDimension, c: Coord3, desc: undefined | string) {
  new Location(name, d, c, desc).commitToDb();
}

function getTestForDescVal(name: string, val: undefined | string, body: (name: string, d: McDimension, c: Coord3, desc: undefined | string, cs: CaseGenT) => void, caseGen: CaseGenT) {
  return () => {
    setupTestUpdate(name, McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, val)
    body(name, McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }, val, caseGen);
  }
}

function okTest(test: () => boolean) {
  return () => {
    if (!test()) {
      throw new Error("Test failed");
    }
  }
}

function locationUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string, caseGen: CaseGenT) {
  const ok = [
    ["REcommit is consistent (coord)", okTest(caseGen(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc))],
    ["REcommit is consistent (coord second same)", okTest(caseGen(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc))],
    ["REcommit is consistent (coord third)", okTest(caseGen(name, d, { x: c.x + 3, y: c.y, z: c.z }, desc))],
  ];
  testRunner('update ' + name, ok, []);
}

function dimUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string, caseGen: CaseGenT) {
  const ok = [
    // ignore warnings for this one!
    // this is a weird one, technically the first case generates a new dimension-name pair (id)
    ["REcommit is consistent (dim)", okTest(() => !caseGen(name, (d == McDimension.END ? McDimension.OVERWORLD : McDimension.END), c, desc)())],
    // the second one tries to update the existing thing, which succeeds
    ["REcommit is consistent (dim same)", okTest(caseGen(name, (d == McDimension.END ? McDimension.OVERWORLD : McDimension.END), c, desc))],
    // an the third one creates yet another dimension-name pair (id)
    ["REcommit is consistent (dim new)", okTest(() => !caseGen(name, (d == McDimension.END ? McDimension.END : McDimension.NETHER), c, desc)())],
  ];
  testRunner('update ' + name, ok, []);
}

function descUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string, caseGen: CaseGenT) {
  const ok = [
    ["REcommit is consistent (desc)", okTest(caseGen(name, d, c, desc === undefined ? "myDescxd" : undefined))],
    ["REcommit is consistent (desc same)", okTest(caseGen(name, d, c, desc === undefined ? "myDescxd" : undefined))],
    ["REcommit is consistent (desc new)", okTest(caseGen(name, d, c, "myDescxd2"))],
  ];
  testRunner('update ' + name, ok, []);
}

function allUpdateTest(name: string, d: McDimension, c: Coord3, desc: undefined | string, caseGen: CaseGenT) {
  const ok = [
    ["REcommit is consistent (all)", okTest(caseGen(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc === undefined ? "myDescxd" : undefined))],
    ["REcommit is consistent (all same)", okTest(caseGen(name, d, { x: c.x + 1, y: c.y, z: c.z }, desc === undefined ? "myDescxd" : undefined))],
    ["REcommit is consistent (all new)", okTest(caseGen(name, d, { x: c.x + 3, y: c.y, z: c.z }, "myDescxd2"))],
  ];
  testRunner('update ' + name, ok, []);
}

function TESTremove() {
  const name = "removeloc";
  const dim = McDimension.OVERWORLD;
  const loc = new Location(name, dim, { x: 0, y: 1, z: 3 }, undefined);
  loc.commitToDb();
  const remove = () => loc.remove();
  const cantRetreive = () => {
    try {
      locationFromDb(name, dim);
      return false;
    } catch {
      return true;
    }
  }
  const ok = [
    ["just remove ok", okTest(() => {
      remove();
      return cantRetreive();
    })]
  ];
  testRunner('remove', ok, []);
}

function TESTdoubleRemove() {
  const name = "removeloc";
  const dim = McDimension.OVERWORLD;
  const loc = new Location(name, dim, { x: 0, y: 1, z: 3 }, undefined);
  loc.commitToDb();
  const remove = () => loc.remove();
  const ok = [
    ["double remove ok", okTest(() => {
      remove();
      remove();
      return true;
    })]
  ];
  testRunner('double remove', ok, []);
}

export function locationsSuite() {
  setQuietMode(true);
  initProvider(TEST_BACKEND);
  if (initialize() !== undefined) {
    throw new Error("Failed to initialize the test environment! SOME TESTS DID NOT RUN");
  }

  makeTest(TESTinsert)();
  makeTest(TESTinsertCoherence)();
  makeTest(TESTremove)();
  makeTest(TESTdoubleRemove)();

  for (const { n: name, t: test } of [{ n: 'location', t: locationUpdateTest }, { n: 'dimension', t: dimUpdateTest }, { n: 'desc', t: descUpdateTest }, { n: 'all', t: allUpdateTest },]) {
    for (const { n: sep, d: desc } of [{ n: '1', d: undefined }, { n: '2', t: "mydesc" }]) {
      for (const { n: caseName, c: testCase } of [{ n: 'db', c: updateAndRetrieveCase }, { n: 'coherent', c: updateAndRetrieveCoherentCase }]) {
        makeTest(getTestForDescVal(`${name}${sep}${caseName}`, desc, test, testCase))();
      }
    }
  }
  setQuietMode(false);
}
