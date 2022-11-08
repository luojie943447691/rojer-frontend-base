import { ParsedArgs } from 'minimist';
import { pluginPrefix } from './constants';
import { GeneratorApi } from './GeneratorApi';
import { loadConfig } from './loadConfig';
import { plugin as pluginCore } from './pluginCore';
import { HtmlCodeType, Import, InternalPlugin, OriginSource, Plugin, Source } from './types';
export class Dispatcher {
  cwd = `${process.cwd()}`;
  argv!: ParsedArgs;
  temp = `${this.cwd}/src/.temp`;
  pkg = require(`${this.cwd}/package.json`);
  config: Record<string, unknown> = {};
  plugins: InternalPlugin[] = [];

  // main.ts 文件用到
  entryImports: Record<string, Import> = {};
  entryCodes: string[] = [];

  // config.ts 用到的
  configCodes: Record<string, string> = {};

  // 用来存放 需要保存到 .temp 文件夹下的内容
  sources: Source[] = [];

  htmlCodes: Record<HtmlCodeType, string[]> = {
    head: [],
    bodyAfter: [],
    bodyBefore: [],
    bodyScript: [],
  };

  constructor(args: ParsedArgs) {
    this.argv = args;
  }

  async init() {
    this.config = await loadConfig();
    // 加载插件
    this.resolvePlugins();
  }

  async invokeHook(hook: keyof Omit<Plugin, 'include'>) {
    for (const plugin of this.plugins) {
      const { id } = plugin;
      await plugin[hook]?.(new GeneratorApi(id, this));
    }
  }

  async dispatch() {
    await this.invokeHook('commit');
    await this.invokeHook('processor');
    await this.invokeHook('complete');
  }

  resolvePlugins() {
    Object.keys(this.pkg.devDependencies || {})
      .concat(Object.keys(this.pkg.dependencies || {}))
      .filter(d => d.startsWith(pluginPrefix))
      .map(id => ({
        id,
        plugin: require(require.resolve(id, { paths: [this.cwd] })).plugin as Plugin,
      }))
      // 最后加载 core 的逻辑
      .concat([{ id: `${pluginPrefix}core`, plugin: pluginCore }])
      .filter(({ plugin: { include } }) => !include || include(this))
      .forEach(({ id, plugin }) => {
        this.plugins.push({ id, ...plugin });
      });
  }
}
