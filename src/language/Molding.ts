/*
# Molding

Basically is the functionality of `getHoles` that we've talked about, but with a nicer name.
*/

import { atRev, cons, len, nil, PList, shift } from "../data/PList";
import { State } from "../State";
import { Ctx } from "./Ctx";
import { Path, PathSteps } from "./Path";
import { infer } from "./Inference";
import { evaluate, normalize, normalizeTyp, reflect } from "./Normalization";
import { Sem, SemArr, SemPie, SemTyp } from "./Semantics";
import { Id, Syn, SynApp, SynLam, SynLamNrm, SynLet, SynNeu, SynNeuNrm, SynNrm, SynPieNrm, SynTypNrm, SynUni, U_omega } from "./Syntax";

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.
*/

export type HoleShape = {T: SynTypNrm, ctx: Ctx, path: Path};

export function mold(state: State, path: Path): HoleShape {
  // T: normalized type
  // t: normalized term with type T 
  function moldSyn(T: SynTypNrm, t: Syn, steps: PathSteps, ctx: Ctx = nil()): HoleShape {
    function go(T: SynTypNrm, t: Syn, steps: PathSteps, ctx: Ctx): HoleShape {
      let sft = shift(steps);
      if (sft !== undefined) {
        let [step, stepsRest] = sft;
        switch (step.case) {
          case "pie": {
            let tUni = T as SynUni;
            let tPie = t as SynPieNrm;
            switch (step.subcase) {
              case "dom": return go(tUni, tPie.dom, stepsRest, ctx);
              case "cod": return go(tUni, tPie.cod, stepsRest, cons({id: tPie.id, T: tPie.dom}, ctx));
            }
            break;
          }
          case "lam": {
            let TPie = T as SynPieNrm;
            let tLam = t as SynLam;
            return go(TPie.cod, tLam.bod, stepsRest, cons({id: tLam.id, T: TPie.dom}, ctx));
          }
          case "let": {
            let tLet = t as SynLet;
            switch (step.subcase) {
              case "dom": return go(U_omega, tLet.dom, stepsRest, ctx);
              case "arg": return go(normalizeTyp(tLet.dom), tLet.arg, stepsRest, ctx);
              case "bod": return go(T, tLet.bod, stepsRest, cons({id: tLet.id, T: normalizeTyp(tLet.dom)}, ctx));
            }
            break;
          }
          case "app": {
            let tApp = t as SynApp;
            let F = infer(tApp.app, ctx) as SynPieNrm;
            switch (step.subcase) {
              case "app": return go(F, tApp.app, stepsRest, ctx);
              case "arg": return go(F.dom, tApp.arg, stepsRest, ctx);
            }
          }
        }
      } else {
        // here
        return {T, ctx, path};
      }
    }
    return go(T, t, steps, ctx);
  }

  function moldSynTyp(T: Syn, path: PathSteps, ctx: Ctx = nil()): HoleShape
    {return moldSyn(U_omega, T, path, ctx)}
  
  switch (path.top.case) {
    case "sig": return moldSynTyp(state.sig, path.steps);
    case "imp": {
      return moldSyn(normalizeTyp(state.sig), state.imp, path.steps);
    }
    case "buf": {
      let buf = state.bufs[path.top.i];
      let shape = mold(state, buf.path);
      return moldSyn(normalizeTyp(shape.T), buf.t, path.steps, shape.ctx);
    }
  }
}
