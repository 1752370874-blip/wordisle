'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findModelDirectory(root, filenames, ...subdirectory) {
  const candidates = [
    path.join(root, 'models', ...subdirectory),
    path.resolve(root, '../../../..', '词屿离线增强包', 'models', ...subdirectory)
  ];
  return candidates.find(directory => filenames.every(file => fs.existsSync(path.join(directory, file))));
}

const packHint = '请将「词屿离线增强包」和词屿软件文件夹放在同一级目录，再重新打开词屿。';
module.exports = { findModelDirectory, packHint };
