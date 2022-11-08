import { defaultConfigFile } from './constants';
import fs from 'fs';
import { build } from 'esbuild';
import { normalize } from 'path';

const cwd = process.cwd();
export async function loadConfig() {
  const trulyPath = `${cwd}/${defaultConfigFile}`;
  if (!fs.existsSync(trulyPath)) return {};
  const text = await bundleConfig(trulyPath);
  const fileName = `${trulyPath}.timeStamp-${Date.now()}.js`;
  // 写文件
  try {
    fs.writeFileSync(fileName, text);
    // console.log('require(fileName).default', require(fileName).default);
    // 每被 require 一次 就会被缓存起来，所以我们得去手动删除
    delete require.cache[require.resolve(fileName)];
    
    return require(fileName).default;
  } finally {
    try {
      fs.unlinkSync(fileName);
    } catch (err) {
      //
    }
  }
}

async function bundleConfig(trulyPath: string) {
  const res = await build({
    entryPoints: [trulyPath],
    bundle: true,
    platform: 'node',
    target: ['node14', 'node16'],
    outfile: 'out.js',
    write: false,
  });

  return res.outputFiles[0].text;
}
