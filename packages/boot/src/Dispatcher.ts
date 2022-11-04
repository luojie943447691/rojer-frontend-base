import { ParsedArgs } from "minimist";
export class Dispatcher {
  cwd = `${process.cwd()}`;
  argv!: ParsedArgs;
  temp = `${this.cwd}/src/.temp`;
  constructor(args: ParsedArgs) {
    this.argv = args;
  }

  async init() {}

  async dispatch() {}
}
