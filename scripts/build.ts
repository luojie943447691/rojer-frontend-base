// 如果没有 打开 tsconfig.ts 中的 esModuleInterop 字段需要这么导入
// import * as path from "path";
// 打开之后就可以这么导入
import path, { normalize } from "path";
import { execa } from "execa";
import fs from "fs-extra";


run();

interface PackageType {
  module: string;
  outDir: string;
}

async function run() {
  try {
    await runParallel(
      require("os").cpus().length,
      [
        { module: "commonjs", outDir: "lib" },
        { module: "esnext", outDir: "es" },
      ],
      build
    );
  } finally {
    console.log("执行删除--- lib 之前");
    //  删除文件夹
    await fs.remove(path.resolve(`lib`));
    console.log("删除了--- lib ");

    console.log("执行删除--- es 之前");
    await fs.remove(path.resolve(`es`));
    console.log("删除了--- es ");
  }
}

async function runParallel(
  maxConcurrency: number,
  source: PackageType[],
  iterater: (item: PackageType) => Promise<unknown>
) {
  const ret: Promise<unknown>[] = [];
  const excuting: Promise<unknown>[] = [];
  for (const item of source) {
    const p = Promise.resolve().then(() => iterater(item));
    ret.push(p);

    if (source.length >= maxConcurrency) {
      const e = p.then(() => excuting.splice(excuting.findIndex(e), 1));
      excuting.push(e);

      if (excuting.length >= maxConcurrency) {
        await Promise.race(excuting);
      }
    }
  }

  return Promise.all(ret);
}

async function build({ module, outDir }: PackageType) {
  await execa("tsc", ["--module", module, "--outDir", outDir]);

  // 获取目录文件夹
  const dirs = await fs.readdir(normalize(`${outDir}/packages`));
  console.log("dirs", dirs);
  // 这样写会导致问题  no such file or directory
  // 猜测原因 nodejs 后台不知道某个文件已经删除了或者正在被删除（看 run 函数的 finally 模块）
  //     此时找它下面的文件夹 ，肯定是报错的。如果想看报错，把 console.log 的注释打开，然后打包
  //     到报错即可看到。所以最后删除根目录的 lib 和 es 文件夹需要等到所有文件夹都 remove
  //     执行完毕之后再执行
  // 真正的原因是 forEach 造成的， foreach 是同步函数，执行完成之后会继续执行主任务的代码
  //     而不是去等待里面的函数执行 https://zhuanlan.zhihu.com/p/128551597
  // dirs.forEach(async (item) => { // 这里的 async 和 await 是针对 foreach 这个同步函数的
  //   await fs.remove(normalize(`packages/${item}/${outDir}`));

  //   console.log(
  //     normalize(`${outDir}/packages/${item}/src`),
  //     " --> ",
  //     normalize(`packages/${item}/${outDir}`)
  //   );

  //   await fs.move(
  //     normalize(`${outDir}/packages/${item}/src`),
  //     normalize(`packages/${item}/${outDir}`)
  //   );
  // });

  // 可以使用 这个来代替 foreach
  // await Promise.all(
  //   dirs.map(async (item) => {
  //     await fs.remove(normalize(`packages/${item}/${outDir}`));
  //     // console.log(
  //     //   normalize(`${outDir}/packages/${item}/src`),
  //     //   " --> ",
  //     //   normalize(`packages/${item}/${outDir}`)
  //     // );
  //     await fs.move(
  //       normalize(`${outDir}/packages/${item}/src`),
  //       normalize(`packages/${item}/${outDir}`)
  //     );
  //   })
  // );

  // 也可以使用 forof 来代替 foreach
  for (const item of dirs) {
    await fs.remove(normalize(`packages/${item}/${outDir}`));
    // console.log(
    //   normalize(`${outDir}/packages/${item}/src`),
    //   " --> ",
    //   normalize(`packages/${item}/${outDir}`)
    // );
    await fs.move(
      normalize(`${outDir}/packages/${item}/src`),
      normalize(`packages/${item}/${outDir}`)
    );
  }
}
