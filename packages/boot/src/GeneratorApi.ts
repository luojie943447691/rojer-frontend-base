import { Dispatcher } from './Dispatcher';
import { readFile, pathExists, ensureFile, writeFile } from 'fs-extra';
import { HtmlCodeType, Import, OriginSource } from './types';
import { resolve } from 'path';
import { pluginPrefix } from './constants';
import { render } from 'ejs';
import { normalizePath } from 'vite';

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

  // 添加 main.ts 的 imports 字段
  addEntryImports(entry: Record<string, Import>) {
    this.dispatcher.entryImports = entry;
  }

  // 添加 main.ts 的 普通代码
  addEntryCodes(...codes: string[]) {
    this.dispatcher.entryCodes.push(...codes);
  }

  resolveTempPath(name: string) {
    return this.normalizePath(resolve(this.dispatcher.temp, this.id.substring(pluginPrefix.length), name));
  }

  normalizePath(path: string) {
    return normalizePath(path);
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
