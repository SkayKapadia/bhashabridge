import * as fs from 'fs';
import * as path from 'path';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 20000 });

  for (const file of fs.readdirSync(__dirname)) {
    if (file.endsWith('.test.js')) {
      mocha.addFile(path.resolve(__dirname, file));
    }
  }

  return new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
