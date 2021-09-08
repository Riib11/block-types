import { map, PList } from "../data/PList";
import { Id, SynTypNrm } from "./Syntax";

export type Ctx = PList<{id: Id, T: SynTypNrm}>;
export type Ids = PList<Id>;

export function ctxToIds(ctx: Ctx): Ids
  {return map(item => item.id, ctx)}