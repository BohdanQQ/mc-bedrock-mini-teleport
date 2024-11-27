import { parseBmtpCommand, ParsingError, SilentError } from '../scripts/bmtp-parser';
import * as types from '../scripts/bmtp-types';

export function commandCtor(...args: string[]): string {
  return `${types.BMTP_COMMAND_HEAD} ${args.join(' ')}`;
}

function enforceParseOk(input: string): types.BmTpCommand {
  const rv = parseBmtpCommand(input);
  if (rv instanceof SilentError || rv instanceof ParsingError) {
    const msg = rv instanceof ParsingError ? rv.msg : "silent error";
    throw new Error(`Parsing of '${input}' failed despite being expected not to fail: ${msg}`);
  }
  return rv;
}

function enforceNotParsable(input: string) {
  try {
    const val = parseBmtpCommand(input);
    if (val instanceof ParsingError || val instanceof SilentError) {
      return;
    }
    console.log(val);
    throw new Error(`Expected failure to parse ${input}, insted got a value.`);
  } catch (e) {
    throw new Error(`Unexpected parsing fail (should return null, not fail) for input ${input}: ${e}`);
  }
}

export function simpleParsableTest(input: string, evaluator: (res: types.BmTpCommand) => boolean) {
  const parsed = enforceParseOk(input);
  if (!evaluator(parsed)) {
    throw new Error(`Parsing of ${input} yielded unexpected result`);
  }
}

export function simpleNotParsableTest(input: string) {
  enforceNotParsable(input);
}

// lol cant care less
let exitCode = 0;
let countPassed = 0;
let countTotal = 0;

export function testInform(testName: string) {
  console.info(`---------------Test ${testName}---------------`);
}

export function testRunner(description: string, expectedOk: (string | (() => void))[][], expectedFail: (string | (() => void))[][]) {
  testInform(description);
  for (const [tDesc, test] of expectedOk.concat(expectedFail)) {
    countTotal += 1;
    if (typeof tDesc === 'string' && typeof test !== 'string') {
      try {
        test();
      } catch (e) {
        console.error(`TEST ${tDesc} FAIL:\n${e}\n`);
        exitCode = 1;
        continue;
      }
      countPassed += 1;
    } else {
      throw new Error("Impossible error")
    }
  }
}

export function summary() {

  if (exitCode !== 0) {
    throw new Error("Some tests failed");
  }

  console.log(`Ran ${countTotal} tests, ${countPassed} passed, ${countTotal - countPassed} failed`);
}

export function goodBad(g, b): { good: string, bad: string } {
  return { good: g, bad: b };
}


export function combinations(argChoices: ({ good: string, bad: string })[], toExpand: ({ combination: string[], allGood: boolean })[]): ({ combination: string[], allGood: boolean })[] {
  const result: ({ combination: string[], allGood: boolean })[] = [];
  for (const obj of toExpand) {
    const choice = argChoices[0];
    result.push({
      combination: [...obj.combination, choice.good],
      allGood: obj.allGood
    });
    result.push({
      combination: [...obj.combination, choice.bad],
      allGood: false
    });
  }

  if (argChoices.length === 1) {
    return result;
  }

  return combinations(argChoices.slice(1), result);
}