import { Dispatcher } from './Dispatcher';
import { readFile, pathExists, ensureFile, writeFile } from 'fs-extra';
import { HtmlCodeType, Import, OriginSource } from './types';
import { normalize, resolve } from 'path';
import { pluginPrefix } from './constants';
import { render } from 'ejs';

export class GeneratorApi {
  id!: string;
  dispatcher!: Dispatcher;

  constructor(id: string, dispatcher: Dispatcher) {
    this.id = id;
    this.dispatcher = dispatcher;
  }

  readFiles(...paths: string[]) {
    return paths.map(id => readFile(id, { encoding: 'utf8' }));
  }

  get cwd() {
    return this.dispatcher.cwd;
  }

  get config() {
    return this.dispatcher.config;
  }

  get pkg() {
    return this.dispatcher.pkg;
  }

  source(sources: OriginSource[], codes: Record<string, unknown>) {
    sources.forEach(d => {
      this.dispatcher.sources.push({
        ...d,
        data: codes,
      });
    });
  }

  addHeadTemplate(type: HtmlCodeType, content: string) {
    this.dispatcher.htmlCodes[type].push(content);
  }

  resolveTempPath(name: string) {
    return normalize(resolve(this.dispatcher.temp, this.id.substring(pluginPrefix.length), name));
  }

  // 生成 main.ts 文件的导入部分
  generateEntryImports(entryImports: Record<string, Import>) {
    return Object.keys(entryImports)
      .map(from => {
        const { defaultSpecifier, specifiers } = entryImports[from];

        return `import ${[defaultSpecifier, specifiers?.size && `{ ${[...specifiers].join(',')} }`]
          .filter(Boolean)
          .join(', ')} from '${from}'`;
      })
      .join('\n ');
  }

  // 写入文件
  async writeToDisk() {
    // 如果文件存在，且不是 override 状态
    return Promise.all(
      this.dispatcher.sources.map(async ({ path, template, override, data }) => {
        if ((await pathExists(path)) && !override) return;
        await ensureFile(path);
        await writeFile(path, render(template, data));
      })
    );
  }
}
