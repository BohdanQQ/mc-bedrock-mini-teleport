import { readFile, writeFile } from 'fs/promises';




/*
generates a file like this:

import { BmTpLocationMap } from "./bmtp-types";


const staticLocations: BmTpLocationMap = new Map(
  [
    ["one", { x: 256, y: 256, z: 256 }],
    ["two", { x: 0, y: 123, z: 0 }],
    ["alpha", { x: 111, y: 0, z: -90 }],
    ["beta", { x: 666, y: 67, z: 0 }],
    ["gamma", { x: 0, y: 777, z: -23 }],
  ]
);

export { staticLocations };
*/

readFile('locations.csv', 'utf-8').then((data) => {
  const locations = new Map<string, { x: number, y: number, z: number }>();
  const lines = data.split('\n').filter(v => v.trim() !== '');
  for (const line of lines) {
    const [name, x, y, z] = line.split(',');
    if (locations.has(name)) {
      console.error('Duplicate location names found: ' + name);
      process.exit(1);
    }
    locations.set(name, { x: Number(x), y: Number(y), z: Number(z) });
  }
  const fileContent = `import { BmTpLocationMap } from "./bmtp-types";\nconst staticLocations: BmTpLocationMap = new Map(\n  [\n${Array.from(locations.entries()).map(([k, { x, y, z }]) => `    ["${k}", { x: ${x}, y: ${y}, z: ${z} }]`).join(',\n')}\n  ]\n);\n\nexport { staticLocations };`;
  writeFile('./scripts/locations.ts', fileContent);
  console.log('File written!');
});
