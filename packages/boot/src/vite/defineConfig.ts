import { CSSOptions, UserConfigExport, UserConfigFn } from 'vite';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vue from '@vitejs/plugin-vue';
import Pages from 'vite-plugin-pages';
import AutoImport from 'unplugin-auto-import/vite';
import { getExportsStatic } from 'pkg-exports';
import fs from 'fs-extra';

const cwd = process.cwd();

export interface IConfig {
  vite?: UserConfigExport;
  pluginVueConfig?: Parameters<typeof vue>[0];
  pluginVueJsxConfig?: Parameters<typeof vueJsx>[0];
  pluginPagesConfig?: Parameters<typeof Pages>[0];
}

function declareTemplate(selectors: string[]) {
  return `interface CssModules{
      ${selectors.map(d => `${d.includes('-') ? `'${d}'` : `${d}`} : string`).join('\n      ')}
    }
  
  declare const AppCssMoudules: CssModules

  export = AppCssMoudules

  `;
}

function generateDeclare(cssFileName: string, json: Record<string, string>) {
  fs.writeFile(`${cssFileName}.d.ts`, declareTemplate(Object.keys(json)), err => {
    if (err) {
      console.error(err);
    }
  });
}
// 生成 .module.scss 对应的 d.ts 文件
function declareCssModules(options: CSSOptions): CSSOptions {
  if (options.modules === false) {
    return options;
  }

  const getJSON = options.modules?.getJSON;
  return {
    ...options,
    modules: {
      getJSON(cssFileName, json, outputFileName) {
        // 生成 scss 对应的 .d.ts 文件
        generateDeclare(cssFileName, json);

        return getJSON?.(cssFileName, json, outputFileName);
      },
    },
  };
}

export function defineConfig(userConfig: IConfig): UserConfigFn {
  const { vite = {}, pluginVueConfig, pluginVueJsxConfig, pluginPagesConfig } = userConfig;
  return async env => {
    const config = typeof vite === 'function' ? await vite(env) : await vite;
    config.root = config.root ?? `${cwd}/src/.temp/core`;
    config.envDir = config.envDir ?? cwd;
    config.publicDir = config.publicDir ?? `${cwd}/public`;

    config.resolve = {
      ...config.resolve,
      alias: {
        '@': `${cwd}/src`,
        ...config.resolve?.alias,
      },
    };

    config.build = {
      outDir: `${cwd}/dist`,
      ...config.build,
    };

    const exports = (await Promise.allSettled([getExportsStatic('naive-ui')])).map(t =>
      t.status === 'fulfilled' ? t.value : []
    );
    config.plugins = [
      vue(pluginVueConfig),
      vueJsx(pluginVueJsxConfig),
      Pages({
        dirs: [`${cwd}/src/pages`],
        exclude: [`**/components/**`, `**/hooks/**`],
        extensions: ['tsx'],
        ...pluginPagesConfig,
      }),
      AutoImport({
        dts: true,
        include: [/\.[tj]sx$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
        eslintrc: {
          enabled: true,
        },
        imports: [
          'vue',
          'vue-router',
          {
            'naive-ui': exports[0].filter(d => d.startsWith('N') || d.startsWith('use')),
          },
        ],
      }),
    ];

    config.css = {
      ...config.css,
      modules: config.css?.modules !== false && {
        generateScopedName: '[local]__[hash:base64:5]',
        localsConvention: 'camelCaseOnly',
      },
    };

    // 如果是本地开发模式
    if (env.command === 'serve') {
      config.css = declareCssModules(config.css);
    }
    return config;
  };
}
