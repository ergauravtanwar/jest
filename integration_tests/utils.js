/**
 * Copyright (c) 2014, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

const {spawnSync} = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const rimraf = require('rimraf');

const run = (cmd, cwd) => {
  const args = cmd.split(/\s/).slice(1);
  const spawnOptions = {cwd};
  const result = spawnSync(cmd.split(/\s/)[0], args, spawnOptions);

  if (result.status !== 0) {
    const message = `
      ORIGINAL CMD: ${cmd}
      STDOUT: ${result.stdout && result.stdout.toString()}
      STDERR: ${result.stderr && result.stderr.toString()}
      STATUS: ${result.status}
      ERROR: ${result.error}
    `;
    throw new Error(message);
  }

  return result;
};

const linkJestPackage = (packageName, cwd) => {
  const packagesDir = path.resolve(__dirname, '../packages');
  const packagePath = path.resolve(packagesDir, packageName);
  const destination = path.resolve(cwd, 'node_modules/');
  run(`mkdir -p ${destination}`);
  return run(`ln -sf ${packagePath} ${destination}`);
};

const fileExists = filePath => {
  try {
    fs.accessSync(filePath, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const makeTemplate = string => {
  return values => {
    return string.replace(/\$(\d+)/g, (match, number) => {
      return values[number - 1];
    });
  };
};

const cleanup = (directory: string) => rimraf.sync(directory);

const makeTests = (directory: string, tests: {[filename: string]: string}) => {
  mkdirp.sync(directory);
  Object.keys(tests).forEach(filename => {
    fs.writeFileSync(path.resolve(directory, filename), tests[filename]);
  });
};

const createEmptyPackage = (directory, packageJson) => {
  const DEFAULT_PACKAGE_JSON = {
    description: 'THIS IS AN AUTOGENERATED FILE AND SHOULD NOT BE ADDED TO GIT',
    jest: {
      testEnvironment: 'node',
    },
  };

  mkdirp.sync(directory);
  packageJson || (packageJson = DEFAULT_PACKAGE_JSON);
  fs.writeFileSync(
    path.resolve(directory, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

};

const extractSummary = stdout => {
  const match = stdout.match(
    /Test Suites:.*\nTests.*\nSnapshots.*\nTime.*\nRan all tests.*\n*$/gm
  );
  if (!match) {
    throw new Error(`
      Could not find test summary in the output.
      OUTPUT:
        ${stdout}
    `);
  }

  const summary = match[0]
    .replace(/\d*\.?\d+m?s/g, '<<REPLACED>>')
    .replace(/, estimated <<REPLACED>>/g, '');

  const rest = stdout
    .slice(0, -match[0].length)
    // remove all timestamps
    .replace(/\s*\(.*ms\)/gm, '');

  return {summary, rest};
};

module.exports = {
  cleanup,
  createEmptyPackage,
  extractSummary,
  fileExists,
  linkJestPackage,
  makeTemplate,
  makeTests,
  run,
};
