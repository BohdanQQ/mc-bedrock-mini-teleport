import { testRunner } from './test-lib';
import { initProvider } from '../scripts/bmtp-data-providers';
import { initialize, Location, locationFromDb } from '../scripts/bmtp-locations';
import { TEST_PROVIDER } from '../scripts/data-providers/test';
import { McDimension } from '../scripts/bmtp-types';
import { setQuietMode } from '../scripts/bmtp-mc-lib';

function TESTtest() {
  const ok = [
    ["commit test", () => { new Location("xd", McDimension.OVERWORLD, { x: 0, y: 1, z: 3 }).commitToDb(); return true }],
  ];
  testRunner('test provider works', ok, [["commit was ok (TODO: fails now)", () => {
    if (locationFromDb("xd", McDimension.OVERWORLD) !== undefined) {
      throw new Error("Fixed");
    }
  }]]);
}

export function testSuite() {
  setQuietMode(true);
  initProvider(TEST_PROVIDER);
  if (initialize() !== undefined) {
    throw new Error("Failed to initialize the test environment! SOME TESTS DID NOT RUN");
  }
  TESTtest();

  setQuietMode(false);
}
