import { getDimensions } from '../scripts/bmtp-mc-lib';
import { parseArg } from '../scripts/bmtp-parser';
import * as types from '../scripts/bmtp-types';
import { simpleNotParsableTest, simpleParsableTest, commandCtor, testRunner, combinations, goodBad, testInform } from './test-lib';

function TESTparseHelp() {
  const doParse = [
    ["help", () => simpleParsableTest(commandCtor(types.NAMES.help), v => v instanceof types.Help)],
    ["help?", () => simpleParsableTest(commandCtor(types.NAMES.helpQ), v => v instanceof types.Help)]
  ];
  const cannotParse = [
    ['too many args help', () => simpleNotParsableTest(commandCtor(types.NAMES.help, 'garbage'))],
    ['too many args help?', () => simpleNotParsableTest(commandCtor(types.NAMES.helpQ, 'garbage'))]
  ];

  testRunner('help command', doParse, cannotParse);
}

function TESTparseList() {
  const doParse = [
    ["list", () => simpleParsableTest(commandCtor(types.NAMES.list), v => v instanceof types.ListCurrentDimension)],
  ];
  const cannotParse = [
    ['too many args', () => simpleNotParsableTest(commandCtor(types.NAMES.list, 'garbage'))]
  ];
  testRunner('list command', doParse, cannotParse);
}

function TESTparseListAll() {
  const doParse = [
    ["list-all", () => simpleParsableTest(commandCtor(types.NAMES.listAll), v => v instanceof types.ListAll)],
  ];
  const cannotParse = [
    ['too many args', () => simpleNotParsableTest(commandCtor(types.NAMES.listAll, 'garbage'))]
  ];
  testRunner('list-all command', doParse, cannotParse);
}

function TESTparseTeleport() {
  const tpCommandPred = v => v instanceof types.Teleport;
  const doParse = [
    ['basic', () => simpleParsableTest(commandCtor('notbannedname'), tpCommandPred)],
    ['dashes', () => simpleParsableTest(commandCtor('not-banned-name'), tpCommandPred)],
    ['nums', () => simpleParsableTest(commandCtor('01234'), tpCommandPred)],
    ['upper', () => simpleParsableTest(commandCtor('NOTBANNEDNAME'), tpCommandPred)],
    ['all', () => simpleParsableTest(commandCtor('01234-not-banned'), tpCommandPred)],
    ['space prefix', () => simpleParsableTest(commandCtor(' 01234-not-banned'), tpCommandPred)]
  ];

  const cannotParse = [
    ['empty', () => simpleNotParsableTest(commandCtor())],
    ['empty 2', () => simpleNotParsableTest(commandCtor(''))],
    ['whitespace', () => simpleNotParsableTest(commandCtor('\t\n   '))],
    ['special', () => simpleNotParsableTest(commandCtor('?!?!?!??!'))],
    ['garbage end', () => simpleNotParsableTest(types.BMTP_COMMAND_HEAD + 'garbage')],
    ['garbage with valid name', () => simpleNotParsableTest(types.BMTP_COMMAND_HEAD + 'garbage validName')],
    ['correct after garbage', () => simpleNotParsableTest('!garbage' + commandCtor('correct'))],
    ['too many args', () => simpleNotParsableTest(commandCtor('notbannedname', 'garbage'))]
  ];

  testRunner('tp command', doParse, cannotParse);
}

function TESTparseRemove() {
  const isRemoveCommand = v => v instanceof types.RemoveLocation;
  const goodRemoveCmdStart = (...args: string[]) => commandCtor(...[types.NAMES.remove].concat(args));
  const goodDimRemoveCmdStart = (...args: string[]) => goodRemoveCmdStart(...[types.dimString(types.McDimension.END)].concat(args));
  const doParse = [
    ['basic', () => simpleParsableTest(goodDimRemoveCmdStart('notbanned'), isRemoveCommand)],
    ['dashes', () => simpleParsableTest(goodDimRemoveCmdStart('not-banned'), isRemoveCommand)],
    ['nums', () => simpleParsableTest(goodDimRemoveCmdStart('01234'), isRemoveCommand)],
    ['upper', () => simpleParsableTest(goodDimRemoveCmdStart('NOTBANNEDNAME'), isRemoveCommand)],
    ['all', () => simpleParsableTest(goodDimRemoveCmdStart('01234-not-banned'), isRemoveCommand)],
    ['space prefix', () => simpleParsableTest(goodDimRemoveCmdStart(' 01234-not-banned'), isRemoveCommand)]
  ];

  for (const dim of getDimensions()) {
    let dimStr = types.dimString(dim);
    doParse.push(['dim ' + dimStr, () => simpleParsableTest(goodRemoveCmdStart(dimStr, 'ok'), isRemoveCommand)]);
    dimStr = dimStr.toLowerCase();
    doParse.push(['dim ' + dimStr, () => simpleParsableTest(goodRemoveCmdStart(dimStr, 'ok'), isRemoveCommand)]);
  }

  const cannotParse = [
    ['empty locname', () => simpleNotParsableTest(goodDimRemoveCmdStart())],
    ['empty locname 2', () => simpleNotParsableTest(goodDimRemoveCmdStart(''))],
    ['whitespace locname', () => simpleNotParsableTest(goodDimRemoveCmdStart('\t\n   '))],
    ['special locname', () => simpleNotParsableTest(goodDimRemoveCmdStart('?!?!?!??!'))],
    ['invalid dimension', () => simpleNotParsableTest(goodRemoveCmdStart('invalidDimension'))],
    ['too many args', () => simpleNotParsableTest(goodDimRemoveCmdStart('validname', 'garbage'))],
    ['too many args, correct tail', () => simpleNotParsableTest(goodRemoveCmdStart('garbage', types.dimString(types.McDimension.END), 'validname'))]
  ];

  testRunner('remove command', doParse, cannotParse);
}

function TESTparseAddSimple() {
  const isGood = v => v instanceof types.AddFromCurrentLocation;
  const goodAddCmdStart = (...args: string[]) => commandCtor(...[types.NAMES.addCurrentLoc].concat(args));
  const optionalGen = (testName: string, locName: string, desc: string) => [
    [testName, () => simpleParsableTest(goodAddCmdStart(locName), isGood)],
    [`${testName} w desc`, () => simpleParsableTest(goodAddCmdStart(locName, desc), isGood)],
  ];
  const optionalGenN = (testName: string, locName: string, desc: string) => [
    [testName, () => simpleNotParsableTest(goodAddCmdStart(locName))],
    [`${testName} w desc`, () => simpleNotParsableTest(goodAddCmdStart(locName, desc))],
  ];
  const doParse = optionalGen('basic', 'notbanned', 'hahadescription-12312')
    .concat(optionalGen('dashes', 'not-banned', 'hahadescription-12312'))
    .concat(optionalGen('nums', '01234', 'hahadescription-12312'))
    .concat(optionalGen('upper', 'NOTBANNEDNAME', 'hahadescription-12312'))
    .concat(optionalGen('all', '01234-not-banned', 'hahadescription-12312'))
    .concat(optionalGen('space prefix', '01234-not-banned', 'hahadescription-12312'));
  const cannotParse = [
    ['empty locname', () => simpleNotParsableTest(goodAddCmdStart())],
    ['empty locname 2', () => simpleNotParsableTest(goodAddCmdStart(''))],
    ['too many args', () => simpleNotParsableTest(goodAddCmdStart('validname', 'desc', 'garbage'))],
    ['invalid desc', () => simpleNotParsableTest(goodAddCmdStart('validname', '?>":{}{P><{'))]
  ].concat(optionalGenN('whitespace locname', '\t\n   ', "desc"))
    .concat(optionalGenN('special locname 2', '?}{+_:">', "desc"))
    .concat(optionalGenN('special locname 3', '?}{+_:">', "desc??!@?#?!@"));

  testRunner('addCurrent command', doParse, cannotParse);
}

function TESTparseAddCurrDim() {
  const isGood = v => v instanceof types.AddFromCurrentDimension;
  const goodAddCmdStart = (...args: string[]) => commandCtor(...[types.NAMES.addCoords].concat(args));
  const textCasesBasicNoDesc = combinations([goodBad('not-banned12', 'Q?Q?}{"'), goodBad('1', 'a'), goodBad('0', 'c'), goodBad('-1', 'xd')], [{ combination: [types.NAMES.addCoords], allGood: true }])

  const doParse: (string | (() => void))[][] = [];
  const cannotParse: (string | (() => void))[][] = [];
  let counter = 0;
  for (const c of textCasesBasicNoDesc) {
    counter += 1;
    if (c.allGood) {
      doParse.push([`valid combination ${counter}`, () => simpleParsableTest(commandCtor(...c.combination), isGood)]);
      doParse.push([`valid combination ${counter} w desc`, () => simpleParsableTest(commandCtor(...c.combination, 'mydescription'), isGood)]);
      cannotParse.push([`valid  combination ${counter} w invalid desc`, () => simpleNotParsableTest(commandCtor(...c.combination, 'description?!=-129073'))]);
    } else {
      cannotParse.push([`invalid combination ${counter}`, () => simpleNotParsableTest(commandCtor(...c.combination))]);
      cannotParse.push([`invalid combination ${counter} w desc`, () => simpleNotParsableTest(commandCtor(...c.combination, 'description'))]);
      cannotParse.push([`invalid combination ${counter} w invalid desc`, () => simpleNotParsableTest(commandCtor(...c.combination, 'description?!=-129073'))]);
    }
  }

  cannotParse.push(['too many arguments', () => simpleNotParsableTest(goodAddCmdStart('1', '2', '3', '4', '5', '6', '7', 'description?!=-129073'))]);
  cannotParse.push(['missing triplet', () => simpleNotParsableTest(goodAddCmdStart('nameOnly'))]);
  cannotParse.push(['icomplete triplet 1', () => simpleNotParsableTest(goodAddCmdStart('nameOnly', '2'))]);
  cannotParse.push(['icomplete triplet 2', () => simpleNotParsableTest(goodAddCmdStart('nameOnly', '2', '3'))]);

  testRunner('addCurrentDimension command', doParse, cannotParse);
}

function TESTgeneralLocationOp(isGood: (v: any) => boolean, cmd: string) {
  const goodCmdStart = (...args: string[]) => commandCtor(...[cmd].concat(args));
  const textCasesBasicNoDesc = combinations([goodBad('not-banned12', 'Q?Q?}{"'), goodBad('end', 'garbageDimension'), goodBad('1', 'a'), goodBad('0', 'c'), goodBad('-1', 'xd')], [{ combination: [cmd], allGood: true }])

  const doParse: (string | (() => void))[][] = [];
  const cannotParse: (string | (() => void))[][] = [];
  for (const c of textCasesBasicNoDesc) {
    if (c.allGood) {
      doParse.push(['x', () => simpleParsableTest(commandCtor(...c.combination), isGood)]);
      doParse.push(['x desc', () => simpleParsableTest(commandCtor(...c.combination, 'mydescription'), isGood)]);
      cannotParse.push(['x desc not OK', () => simpleNotParsableTest(commandCtor(...c.combination, 'description?!=-129073'))]);

    } else {
      cannotParse.push(['y', () => simpleNotParsableTest(commandCtor(...c.combination))]);
      cannotParse.push(['y desc', () => simpleNotParsableTest(commandCtor(...c.combination, 'description'))]);
      cannotParse.push(['y desc not OK', () => simpleNotParsableTest(commandCtor(...c.combination, 'description?!=-129073'))]);
    }
  }

  cannotParse.push(['too many arguments', () => simpleNotParsableTest(goodCmdStart('1', '2', '3', '4', '5', '6', '7', 'description?!=-129073'))]);
  cannotParse.push(['missing triplet', () => simpleNotParsableTest(goodCmdStart('end', 'end'))]);
  cannotParse.push(['icomplete triplet 1', () => simpleNotParsableTest(goodCmdStart('end', 'end', '2'))]);
  cannotParse.push(['icomplete triplet 2', () => simpleNotParsableTest(goodCmdStart('end', 'end', '2', '3'))]);

  testRunner(`${cmd} command`, doParse, cannotParse);
}

function TESTparseAddCoordsDim() {
  const isGood = v => v instanceof types.AddGeneralLocation;
  TESTgeneralLocationOp(isGood, types.NAMES.addDimCoords);
}

function TESTparseUpdateCoords() {
  const isGood = v => v instanceof types.UpdateGeneralLocation;
  TESTgeneralLocationOp(isGood, types.NAMES.update);
}

function TESTparseDimension() {
  const dimCases: { val: string, expected: undefined | types.McDimension }[] = [
    {
      val: 'eNd',
      expected: types.McDimension.END
    },
    {
      val: 'eNd??',
      expected: undefined
    },
    {
      val: '??eNd??',
      expected: undefined
    },
    {
      val: '??end',
      expected: undefined
    },
    {
      val: '',
      expected: undefined
    },
    {
      val: '\n\n  ',
      expected: undefined
    },
    {
      val: 'end  ',
      expected: undefined
    },
  ].concat(getDimensions().flatMap(d => {
    return [{
      val: `${types.dimString(d)}`,
      expected: d
    }, {
      val: `${types.dimString(d).toLowerCase()}`,
      expected: d
    },
    {
      val: `${types.dimString(d).toUpperCase()}`,
      expected: d
    }];
  }));

  testInform('Dimension parsing');
  for (const { val, expected } of dimCases) {
    try {
      if ((parseArg(val, { name: 'x', type: types.ArgType.Dimension }) as types.WrapMcDimension).dim !== expected) {
        throw new Error(`Value ${val} is not parsed correctly`);
      }
    } catch {
      if (expected !== undefined) {
        throw new Error(`Value ${val} is was supposed to be parsed!`);
      }
    }
  }
}

export function parserSuite() {
  TESTparseHelp();
  TESTparseList();
  TESTparseListAll();
  TESTparseTeleport();
  TESTparseRemove();
  TESTparseAddSimple();
  TESTparseAddCurrDim();
  TESTparseAddCoordsDim();
  TESTparseUpdateCoords();
  TESTparseDimension();
}
