import { atRev, len, PList } from "../data/PList";
import { Ctx, ctxToSub } from "./Ctx";
import { evaluate, reifyTyp } from "./Normalization";
import { Sem, SemPie, SemTyp } from "./Semantics";
import { Id, SynNeu, SynPieNrm, SynTypNrm } from "./Syntax";

// Infer the result type of an application.
export function infer(t: SynNeu, ctx: Ctx): SynTypNrm {
  switch (t.case) {
    case "app": {
      let F = evaluate(infer(t.app, ctx), ctxToSub(ctx)) as SemPie;
      return reifyTyp(F.cod(t.arg), len(ctx));
    }
    case "var": return (atRev(t.ix, ctx) as {id: Id, T: SynTypNrm}).T;
  }
}