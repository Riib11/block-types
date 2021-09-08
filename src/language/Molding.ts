/*
# Molding

Basically is the functionality of `getHoles` that we've talked about, but with a nicer name.
*/

import { atRev, cons, len, nil, PList } from "../data/PList";
import { State } from "../State";
import { Ctx } from "./Ctx";
import { HoleIx, HoleIxSteps } from "./HoleIx";
import { infer } from "./Inference";
import { evaluate, normalizeTyp, reflect } from "./Normalization";
import { Sem, SemArr, SemPie, SemTyp } from "./Semantics";
import { getDbl, Id, Syn, SynApp, SynHol, SynLam, SynLamNrm, SynLet, SynNeu, SynNeuNrm, SynNrm, SynPieNrm, SynTypNrm, SynUni, U_omega } from "./Syntax";

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.
*/

export type HoleShape = {T: SynTypNrm, ctx: Ctx};

export function mold(state: State, ix: HoleIx): HoleShape {
  switch (ix.top.case) {
    case "sig": return moldSynTyp(state.sig, ix.steps);
    case "imp": return moldSyn(normalizeTyp(state.sig), state.imp, ix.steps);
    case "pfb": {
      let pfb = state.pfbs[ix.top.i];
      switch (ix.top.subcase) {
        case "sig": return moldSynTyp(pfb.T, ix.steps, pfb.ctx);
        case "imp": return moldSyn(normalizeTyp(pfb.T), pfb.t, ix.steps, pfb.ctx);
      }
    }
  }
}

// T: normalized type
// t: normalized term with type T 
export function moldSyn(T: SynTypNrm, t: Syn, steps: HoleIxSteps, ctx: Ctx = nil()): HoleShape {
  function go(T: SynTypNrm, t: Syn, ctx: Ctx): HoleShape {
    let step = steps.shift();
    if (step !== undefined) {
      switch (step.case) {
        case "pie": {
          let tUni = T as SynUni;
          let tPie = t as SynPieNrm;
          switch (step.subcase) {
            case "dom": return go(tUni, tPie.dom, ctx);
            case "cod": return go(tUni, tPie.cod, cons({id: tPie.id, T: tPie.cod}, ctx));
          }
          break;
        }
        case "lam": {
          let TPie = T as SynPieNrm;
          let tLam = t as SynLam;
          return go(TPie.dom, tLam.bod, cons({id: tLam.id, T: TPie.dom}, ctx));
        }
        case "let": {
          let tLet = t as SynLet;
          switch (step.subcase) {
            case "dom": return go(U_omega, tLet.dom, ctx);
            case "arg": return go(normalizeTyp(tLet.dom), tLet.dom, ctx);
            case "bod": return go(T, tLet.dom, cons({id: tLet.id, T: normalizeTyp(tLet.dom)}, ctx));
          }
          break;
        }
        case "app": {
          let tApp = t as SynApp;
          let F = infer(tApp.app, ctx) as SynPieNrm;
          switch (step.subcase) {
            case "app": return go(F, tApp.app, ctx);
            case "arg": return go(F.dom, tApp.arg, ctx);
          }
        }
      }
    } else {
      // here
      return {T, ctx};
    }
  }

  return go(T, t, ctx);
}

export function moldSynTyp(T: Syn, ix: HoleIxSteps, ctx: Ctx = nil()): HoleShape
  {return moldSyn(U_omega, T, ix, ctx)}