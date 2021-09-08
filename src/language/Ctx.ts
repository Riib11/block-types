import { cons, map, nil, PList } from "../data/PList";
import { evaluate, SemCtx } from "./Normalization";
import { Id, SynTypNrm } from "./Syntax";

export type Ctx = PList<{id: Id, T: SynTypNrm}>;
export type Ids = PList<Id>;

export function ctxToSemCtx(ctx: Ctx): SemCtx {
  switch (ctx.case) {
    case "cons": {
      let semCtx = ctxToSemCtx(ctx.t);
      return cons(evaluate(ctx.h.T, semCtx), semCtx);
    }
    case "nil": return nil();
  }
}