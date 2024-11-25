import { readFile, writeFile } from 'fs/promises';
import { dimString, BmTpDimensionLocations, BmTpLocationMap, McDimensions } from './scripts/bmtp-types'



/*
generates a file like this:

import { BmTpLocationMap, McDimensions } from "./bmtp-types";
const staticLocations: BmTpLocationMap = new Map(
  [
    [
      McDimensions.OVERWORLD, new Map([
        ["one", { x: 259, y: -14, z: -628 }],
        ["two", { x: 222, y: -39, z: -424 }],
        ["three", { x: 237, y: -32, z: -601 }],
      ])
    ]
  ]
);

export { staticLocations };
*/

function getMetaDimString(dim: McDimensions): string {
  switch (dim) {
    case McDimensions.END: return "McDimensions.END"
    case McDimensions.NETHER: return "McDimensions.NETHER"
    case McDimensions.OVERWORLD: return "McDimensions.OVERWORLD"
  }
}

readFile('locations.csv', 'utf-8').then((data) => {
  const dimLocations: BmTpLocationMap = new Map();
  const allDimensions = [McDimensions.END, McDimensions.NETHER, McDimensions.OVERWORLD];
  const allDimStrings = new Map(allDimensions.map(d => [dimString(d).toLowerCase(), d]));

  for (const dim of allDimensions) {
    dimLocations.set(dim, new Map());
  }
  const lines = data.split('\n').filter(v => v.trim() !== '');
  for (const line of lines) {
    const [dimCode, name, x, y, z] = line.split(',');
    const dcClean = dimCode.trim().toLowerCase();
    const dimension = allDimStrings.get(dcClean);

    if (dimension === undefined) {
      console.error("Invalid dimension identifier: " + dimCode);
      process.exit(1);
    }
    if (dimLocations.get(dimension)!.has(name)) {
      console.error('Duplicate location names found: ' + name);
      process.exit(1);
    }
    dimLocations.get(dimension)!.set(name, { x: Number(x), y: Number(y), z: Number(z) });
  }
  let fileContent = `/* DO NOT REMOVE or EDIT, this file was AUTOGENERATED by gen-locations.ts */\nimport { BmTpLocationMap, McDimensions } from "./bmtp-types";\nconst staticLocations: BmTpLocationMap = new Map(\n`

  fileContent += `[\n${Array.from(dimLocations.entries()).map(([dim, locations]) => `    [${getMetaDimString(dim)}, new Map(${`[\n${Array.from(locations.entries()).map(([k, { x, y, z }]) => `    ["${k}", { x: ${x}, y: ${y}, z: ${z} }]`).join(',\n')}\n  ]`
    })]`).join(',\n')}\n  ]`;

  fileContent += `\n);\n\nexport { staticLocations };`;
  writeFile('./scripts/locations.ts', fileContent);
  console.log('File written!');
});
