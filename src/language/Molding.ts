/*
# Molding

Basically is the functionality of `getHoles` that we've talked about, but with a nicer name.
*/

import { atRev, cons, len, nil, PList } from "../data/PList";
import { evaluate, reflect } from "./Normalization";
import { Sem, SemArr, SemPie, SemTyp } from "./Semantics";
import { getDbl, HoleId, Id, Syn, SynHol, SynLamNrm, SynNeu, SynNeuNrm, SynNrm, SynPieNrm, SynTypNrm } from "./Syntax";

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.

TODO: should the HoleShape store the type as a SemTyp or a Syn??
*/

export type HoleShape = {T: SynTypNrm, ctx: HoleCtx};
export type HoleCtx = PList<{id: Id, T: SynTypNrm}>;

// T: normalized type
// t: normalized term with type T 
export function mold(T: SynTypNrm, t: SynNrm, ctx: HoleCtx = nil()): Map<HoleId, HoleShape> {
  let shapes: Map<HoleId, HoleShape> = new Map();

  function goTyp(T: SynTypNrm, ctx: HoleCtx = nil()): void
    {go({case: "uni", lvl: "omega"}, T, ctx)}

  function go(T: SynTypNrm, t: SynNrm, ctx: HoleCtx = nil()): void {
    switch (T.case) {
      case "uni": {
        goTyp(T, ctx);
        let tT = t as SynTypNrm;
        switch (tT.case) {
          case "uni": break;
          case "pie": {
            go(T, tT.dom, ctx);
            go(T, tT.cod, cons({id: tT.id, T: tT.dom}, ctx))// cons({id: t.id, T: t.dom}, ctx));
            break;
          }
          case "app": {
            goNeuTyp(tT, ctx);
            break;
          }
          case "var": break;
          case "hol": break;
        }
        break;
      }
      case "pie": {
        goTyp(T, ctx);
        let tL = t as SynLamNrm;
        go(T.cod, tL.bod, cons({id: T.id, T: T.dom}, ctx));
        break;
      }
      case "app": break; // TODO: the applicant must be a free var (right?)
      case "var": break;
    }
  }

  function goNeuTyp(t: SynNeuNrm, ctx: HoleCtx): SynPieNrm {
    switch (t.case) {
      case "app": {
        let F = goNeuTyp(t.app, ctx);
        go(F.dom, t.arg, ctx);
        return F.cod as SynPieNrm;
      }
      case "var": return atRev(t.dbl, ctx).T as SynPieNrm;
    }
  }

  go(T, t, ctx);

  return shapes;
}

  // function goSem(T: Syn, t: Syn, ctx: HoleCtx = nil()): void {
  //   switch (T.case) {
  //     case "uni": {
  //       switch (t.case) {
  //         case "uni": return;
  //         case "pie": {
  //           goSemTyp(tTyp.dom, ctx);
  //           goSem(T, tTyp.dom, ctx); // TODO: is this right?
  //           goSem(
  //             T,
  //             tTyp.cod(reflect(tTyp.dom, {case: "var", id: tTyp.id, dbl: len(ctx)})) as SemTyp,
  //             cons({id: tTyp.id, T: tTyp.dom}, ctx)
  //           ); 
  //           return;
  //         }
  //         case "app": goApp(tTyp, ctx); return;
  //         case "var": return;
  //         case "hol": shapes.set(tTyp.id, {T, ctx}); return;
  //       }
  //       break;
  //     }
  //     case "pie": {
  //       goSemTyp(
  //         T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp,
  //         ctx
  //       );
  //       // t is either a function of a hole
  //       console.log("t:"); console.log(t);
  //       if (typeof(t) === "function") {
  //         goSem(
  //           T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp,
  //           (t as SemArr)(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})),
  //           cons({id: T.id, T: T.dom}, ctx)
  //         );
  //       } else {
  //         let tHol: SynHol = t as SynHol;
  //         shapes.set(tHol.id, {T: T.cod(reflect(T.dom, {case: "var", id: T.id, dbl: len(ctx)})) as SemTyp, ctx}); 
  //         return; // t is a hole
  //       }
  //       return;
  //     }
  //     // TODO: smthng probs wrong here... what does `goApp(T, ctx, dbl)` look like?
  //     case "app": goSem(goApp(T, ctx), t, ctx); return;
  //     case "var": return;
  //     // You cannot inspect a term before it's type hole is filled
  //     case "hol": shapes.set(T.id, {T: {case: "uni", lvl: "omega"}, ctx}); 
  //   }
  // }

  // function goApp(t: SynNeu, ctx: HoleCtx): SemTyp {
  //   function go(t: SynNeu, ctx: HoleCtx): SemPie {
  //     switch (t.case) {
  //       case "app": {
  //         let F: SemPie = go(t.app, ctx);
  //         goSem(F.dom, t.arg, ctx);
  //         return F.cod(t.arg) as SemPie;
  //       }
  //       case "var": return atRev(t.dbl, ctx).T as SemPie;
  //     }
  //   }
  //   switch (t.case) {
  //     case "app": {
  //       let F: SemPie = go(t.app, ctx);
  //       goSem(F.dom, t.arg, ctx);
  //       return F.cod(t.arg) as SemTyp;
  //     }
  //     case "var": return atRev(t.dbl, ctx).T;
  //   }
//   }

//   goSemTyp(T);
//   goSem(T, t);
//   return shapes;
// }