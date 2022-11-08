import { Plugin } from './types';
import { resolve } from 'path';

const resolveTemplate = (name: string) => resolve(__dirname, '../template', name);
export const plugin: Plugin = {
  include: dispatcher => dispatcher.argv._.length === 0,
  async commit(api) {
    // 获取 ejs 文件
    const [indexHtml, mainTs, configTs] = await Promise.all(
      api.readFiles(resolveTemplate('index.html.ejs'), resolveTemplate('main.ts.ejs'), resolveTemplate('config.ts.ejs'))
    );

    const config = api.config

    // 往 htmlHead 天添加数据
    api.addHeadTemplate('head',`<title>${config.title || api.pkg.description || ''}</title>`)

    if(config.keywords){
      api.addHeadTemplate('head', `<meta name="keywords" content="${config.keywords}">`)
    }

    if(config.description){
      api.addHeadTemplate('head', `<meta name="description" content="${config.description}">`)
    }

    api.source(
      [
        { path: api.resolveTempPath('index.html'), template: indexHtml, override: true },
        { path: api.resolveTempPath('main.ts'), template: mainTs, override: true },
        { path: api.resolveTempPath('config.ts'), template: configTs, override: true },
      ],
      {
        htmlHead: api.dispatcher.htmlCodes.head.join('\n  '),
        htmlBodyBefore: api.dispatcher.htmlCodes.bodyBefore.join('\n  '),
        htmlBodyAfter: api.dispatcher.htmlCodes.bodyAfter.join('\n  '),
        htmlBodyScript: api.dispatcher.htmlCodes.bodyScript.join('\n  '),
        entryImports: api.generateEntryImports(api.dispatcher.entryImports),
        entryCodes: api.dispatcher.entryCodes.join('\n'),
        configCode: Object.keys(api.dispatcher.configCodes)
          .map(
            key =>
              ` ${key}:${api.dispatcher.configCodes[key]
                .split('\n')
                .map((d, i) => (i ? `  ${d}` : d))
                .join('\n')}`
          )
          .join('\n'),
      }
    );

  },
  async processor(api) {
    await api.writeToDisk()
  }
};
