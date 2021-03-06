import { cons, map, nil, PList, zip } from "../data/PList";
import { evaluate, Sub } from "./Normalization";
import { eqSyn, Id, SynTypNrm } from "./Syntax";

export type Ctx = PList<{id: Id, T: SynTypNrm}>;
export type Ids = PList<Id>;

export function ctxToSub(ctx: Ctx): Sub {
  switch (ctx.case) {
    case "cons": {
      let semCtx = ctxToSub(ctx.t);
      return cons(evaluate(ctx.h.T, semCtx), semCtx);
    }
    case "nil": return nil();
  }
}

export function eqCtx(ctx1: Ctx, ctx2: Ctx): boolean {
  let ctxZip = zip(ctx1, ctx2);
  let res = true;
  map(item => res = eqSyn(item[0].T, item[1].T), ctxZip);
  return res;
}
