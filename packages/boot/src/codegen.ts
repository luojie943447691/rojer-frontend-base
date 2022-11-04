import { Dispatcher } from "./Dispatcher";
import minimist from "minimist";

export async function codegen() {
  const args = minimist(process.argv.slice(2));
  const dispatcher = new Dispatcher(args);

  await dispatcher.init();
  await dispatcher.dispatch();
}
