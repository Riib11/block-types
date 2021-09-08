import { len, PList } from "../data/PList";
import { Ctx } from "./Ctx";
import { evaluate, reifyTyp, toSemCtx } from "./Normalization";
import { Sem, SemPie, SemTyp } from "./Semantics";
import { getDbl, SynNeu, SynPieNrm, SynTypNrm } from "./Syntax";

// Infer the result type of an application.
export function infer(t: SynNeu, ctx: Ctx): SynTypNrm {
  switch (t.case) {
    case "app": {
      let F = evaluate(infer(t.app, ctx), toSemCtx(ctx)) as SemPie;
      return reifyTyp(F.cod(t.arg), len(ctx));
    }
    case "var": return getDbl(t.dbl, ctx).T;
  }
}