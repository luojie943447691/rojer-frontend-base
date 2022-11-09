import { Plugin } from '@rojer/boot';
import { normalize, resolve } from 'path';

const resolveTemplate = (name: string) => resolve(__dirname, '../template', name);

export const plugin: Plugin = {
  async commit(api) {
    // 读取 template 文件
    // 获取 ejs 文件
    const [appTsx, routerTs] = await Promise.all(
      api.readFiles(resolveTemplate('App.tsx.ejs'), resolveTemplate('router.ts.ejs'))
    );

    api.source(
      [
        { path: api.resolveTempPath('App.tsx'), template: appTsx, override: true },
        { path: api.resolveTempPath('router.ts'), template: routerTs, override: true },
      ],
      {
        
      }
    );

   
    api.addEntryImports({
      vue: {
        specifiers: new Set(['createApp']),
      },
      [api.normalizePath(api.resolveTempPath('App'))]: {
        defaultSpecifier: 'App',
      },
      [api.normalizePath(api.resolveTempPath('router'))]: {
        defaultSpecifier: 'router',
      },
    });

    api.addEntryCodes('const app = createApp(App)', 'app.use(router)', 'app.mount("#app")');
  },
};
