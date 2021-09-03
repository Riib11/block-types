/*
# Molding

Basically is the functionality of `getHoles` that we've talked about, but with a nicer name.
*/

import { atRev, cons, len, nil, PList } from "../data/PList";
import { evaluate, reflect } from "./Normalization";
import { Sem, SemArr, SemPie, SemTyp } from "./Semantics";
import { HoleId, Syn, SynNeu } from "./Syntax";

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.

TODO: should the HoleShape store the type as a SemTyp or a Syn??
*/

type HoleCtx = PList<SemTyp>;
type HoleShape = [SemTyp, HoleCtx];

export function mold(T: Syn, t: Syn): Map<HoleId, HoleShape> {
  let shapes: Map<HoleId, HoleShape> = new Map();

  function goSem(T: SemTyp, t: Sem, ctx: HoleCtx = nil()): void {
    switch (T.case) {
      case "uni": {
        let tTyp: SemTyp = t as SemTyp;
        switch (tTyp.case) {
          case "uni": return;
          case "pie": {
            goSem(T, tTyp.dom, ctx);
            goSem(
              T,
              tTyp.cod(reflect(tTyp.dom, {case: "var", dbl: len(ctx)})) as SemTyp,
              cons(tTyp.dom, ctx)
            ); 
            return;
          }
          case "app": goApp(tTyp, ctx); return;
          case "var": return;
          case "hol": shapes.set(tTyp.id, [T, ctx]); return;
        }
        break;
      }
      case "pie": {
        goSem(
          T.cod(reflect(T.dom, {case: "var", dbl: len(ctx)})) as SemTyp,
          (t as SemArr)(reflect(T.dom, {case: "var", dbl: len(ctx)})),
          cons(T.dom, ctx)
        );
        return;
      }
      // TODO: smthng probs wrong here... what does `goApp(T, ctx, dbl)` look like?
      case "app": goSem(goApp(T, ctx), t, ctx); return;
      case "var": return;
      // You cannot inspect a term before it's type hole is filled
      case "hol": shapes.set(T.id, [{case: "uni", lvl: -1}, ctx]); 
    }
  }

  function goApp(t: SynNeu, ctx: HoleCtx): SemTyp {
    function go(t: SynNeu, ctx: HoleCtx): SemPie {
      switch (t.case) {
        case "app": {
          let F: SemPie = go(t.app, ctx);
          goSem(F.dom, t.arg, ctx);
          return F.cod(t.arg) as SemPie;
        }
        case "var": return atRev(t.dbl, ctx) as SemPie;
      }
    }
    switch (t.case) {
      case "app": {
        let F: SemPie = go(t.app, ctx);
        goSem(F.dom, t.arg, ctx);
        return F.cod(t.arg) as SemTyp;
      }
      case "var": return atRev(t.dbl, ctx);
    }
  }

  goSem(evaluate(T) as SemTyp, evaluate(t));
  return shapes;
}