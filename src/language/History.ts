import { State } from "../State";

export type History = State[];

const maxHistoryLength = 32;
var history: History = [];

export function pushState(state: State): void {
  let stateClone = JSON.parse(JSON.stringify(state));
  history.push(stateClone);
  if (history.length > maxHistoryLength) history.shift();
}

export function popState(): State | undefined {
  return history.pop();
}