import { Dispatcher } from './Dispatcher';
import { GeneratorApi } from './GeneratorApi';

export interface Plugin {
  // 定义过滤插件的逻辑
  include?(dispatcher: Dispatcher): boolean | void;
  // 资源提交
  commit(api: GeneratorApi): Promise<void> | void;
  // 资源处理逻辑
  processor?(api: GeneratorApi): Promise<void> | void;
  // 所有逻辑执行完成之后的回调
  complete?(): void;
}

export interface Import {
  defaultSpecifier?: string;
  specifiers?: Set<string>;
}

export interface InternalPlugin extends Omit<Plugin, 'include'> {
  id: string;
}

export interface OriginSource {
  path: string;
  template: string;
  override: boolean;
}

export interface Source extends OriginSource {
  data: Record<string, any>;
}

export type HtmlCodeType = 'head' | 'bodyBefore' | 'bodyAfter' | 'bodyScript';
