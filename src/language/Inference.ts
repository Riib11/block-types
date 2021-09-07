import { PList } from "../data/PList";
import { HoleCtx } from "./Molding";
import { evaluate } from "./Normalization";
import { Sem, SemTyp } from "./Semantics";
import { getDbl, SynNeu } from "./Syntax";

// Infer the result type of an application.
export function infer(t: SynNeu, ctx: HoleCtx): SemTyp {
  switch (t.case) {
    case "app": {
      let F = infer(t.app, ctx);
      let ctxSem = ctx as PList<Sem>;
      switch (F.case) {
        case "pie": return F.cod(evaluate(t.arg, ctxSem)) as SemTyp;
        default: throw new Error("Incorrectly normalized type.");
      }
    }
    case "var": return getDbl(t.dbl, ctx).T;
  }
}