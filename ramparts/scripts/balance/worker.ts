// A sim worker: runs the tasks it is sent and posts their summaries back.
import { runTask, type Task } from "./tasks.ts";
declare const self: Worker;
self.onmessage = (e: MessageEvent<{ id: number; tasks: Task[] }>) => {
  postMessage({ id: e.data.id, out: e.data.tasks.map(runTask) });
};
