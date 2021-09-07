/*
# Molding

Basically is the functionality of `getHoles` that we've talked about, but with a nicer name.
*/

import { atRev, cons, len, nil, PList } from "../data/PList";
import { evaluate, reflect } from "./Normalization";
import { Sem, SemArr, SemPie, SemTyp } from "./Semantics";
import { HoleId, Id, Syn, SynHol, SynNeu } from "./Syntax";

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.

TODO: should the HoleShape store the type as a SemTyp or a Syn??
*/

export type HoleCtx = PList<{id: Id, T: SemTyp}>;
export type HoleShape = {T: SemTyp, ctx: HoleCtx};

export function mold(T: SemTyp, t: Sem): Map<HoleId, HoleShape> {
  let shapes: Map<HoleId, HoleShape> = new Map();

  function goSemTyp(T: SemTyp, ctx: HoleCtx = nil()): void
    {goSem({case: "uni", lvl: "omega"}, T, ctx)}

  function goSem(T: SemTyp, t: Sem, ctx: HoleCtx = nil()): void {
    switch (T.case) {
      case "uni": {
        let tTyp: SemTyp = t as SemTyp;
        switch (tTyp.case) {
          case "uni": return;
          case "pie": {
            goSemTyp(tTyp.dom, ctx);
            goSem(T, tTyp.dom, ctx); // TODO: is this right?
            goSem(
              T,
              tTyp.cod(reflect(tTyp.dom, {case: "var", id: tTyp.id, dbl: len(ctx)})) as SemTyp,
              cons({id: tTyp.id, T: tTyp.dom}, ctx)
            ); 
            return;
          }
          case "app": goApp(tTyp, ctx); return;
          case "var": return;
          case "hol": shapes.set(tTyp.id, {T, ctx}); return;
        }
        break;
      }
      case "pie": {
        goSemTyp(
          T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp,
          ctx
        );
        // t is either a function of a hole
        console.log("t:"); console.log(t);
        if (typeof(t) === "function") {
          goSem(
            T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp,
            (t as SemArr)(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})),
            cons({id: T.id, T: T.dom}, ctx)
          );
        } else {
          let tHol: SynHol = t as SynHol;
          shapes.set(tHol.id, {T: T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp, ctx}); 
          return; // t is a hole
        }
        return;
      }
      // TODO: smthng probs wrong here... what does `goApp(T, ctx, dbl)` look like?
      case "app": goSem(goApp(T, ctx), t, ctx); return;
      case "var": return;
      // You cannot inspect a term before it's type hole is filled
      case "hol": shapes.set(T.id, {T: {case: "uni", lvl: "omega"}, ctx}); 
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
        case "var": return atRev(t.dbl, ctx).T as SemPie;
      }
    }
    switch (t.case) {
      case "app": {
        let F: SemPie = go(t.app, ctx);
        goSem(F.dom, t.arg, ctx);
        return F.cod(t.arg) as SemTyp;
      }
      case "var": return atRev(t.dbl, ctx).T;
    }
  }

  goSemTyp(T);
  goSem(T, t);
  return shapes;
}