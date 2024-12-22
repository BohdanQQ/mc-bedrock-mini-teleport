import { getLogger, DataProvider } from '../bmtp-data-providers';

// class TestEntry implements EntryRef {
//   readonly log = getLogger('TestEntry');

//   setValue(value: string): boolean {
//     this.log(`set ${value}`);
//     return false;
//   }

//   value(): undefined | string {
//     this.log(`get`)
//     return undefined;
//   }

//   unset(): boolean {
//     return false;
//   }
// }

const log_test = getLogger("testProvider");
export const TEST_PROVIDER: Required<DataProvider> = {
  get(id: string) {
    log_test(`get ${id}`)
    return undefined;
  },

  set(id: string, val: string) {
    log_test(`set ${id} to ${val}`);
    return undefined;
  },

  knownKeys(): string[] {
    return ['xd', 'xddd'];
  }
};