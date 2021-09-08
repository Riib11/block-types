import { len, nil, shift } from "./data/PList";
import { Ctx, eqCtx } from "./language/Ctx";
import { HoleIx, HoleIxSteps } from "./language/HoleIx";
import { infer } from "./language/Inference";
import { HoleShape, mold } from "./language/Molding";
import { evaluate, evaluateTyp, normalize, normalizeTyp, reifyTyp } from "./language/Normalization";
import { SemTyp } from "./language/Semantics";
import { eqSyn, Id, isConcrete, showSyn, Syn, SynApp, SynLam, SynLamNrm, SynLet, SynNeu, SynPie, SynPieNrm, SynTypNrm } from "./language/Syntax";

export type State = {
  sig: Syn; // top-level type
  imp: Syn; // top-level term
  pfbs: Prefab[]; // prefabs
  ix: HoleIx | undefined, // focussed hole id
}

export type Prefab = {
  ctx: Ctx,
  T: Syn,
  t: Syn,
}

export type Trans
  = {case: "select", ix: HoleIx} // select a hole as the new focussed hole
  | {case: "fill", t: Syn} // fill the focussed hole with a term
  | {case: "fill prefab", i: number} // attempt to fill the focussed hole with the prefab at index i
  | {case: "new prefab", pfb: Prefab} // create a new prefab
  | {case: "rename", id: Id, lbl: string} // rename an Id

export function update(state: State, trans: Trans): void {
  console.log("================================================")
  console.log("update");
  console.log("state:"); console.log(state);
  console.log("trans:"); console.log(trans);

  switch (trans.case) {
    case "select": {
      state.ix = trans.ix;
      break;
    }
    case "fill": {
      if (state.ix === undefined) {
        console.log("You must select a hole before filling.");
        break;
      }
      switch (state.ix.top.case) {
        case "sig": state.sig = fillSyn(state.sig, trans.t, state.ix.steps); break;
        case "imp": state.imp = fillSyn(state.imp, trans.t, state.ix.steps); break;
        case "pfb": {
          let pfb = state.pfbs[state.ix.top.i];
          switch (state.ix.top.subcase) {
            case "sig": pfb.T = fillSyn(pfb.T, trans.t, state.ix.steps); break;
            case "imp": pfb.t = fillSyn(pfb.t, trans.t, state.ix.steps); break;
          }
        }
      }
      // unfocus
      state.ix = undefined;
      break;
    }
    case "fill prefab": {
      if (state.ix === undefined) {
        console.log("You must select a hole before filling.");
        break;
      }
      let shape = mold(state, state.ix);
      let pfb = state.pfbs[trans.i]
      // check that types matche
      if (!eqSyn(shape.T, pfb.T)) {
        console.log("You cannot fill a hole with a prefab of a different type.");
        break;
      }
      // check that contexts match
      if (!eqCtx(shape.ctx, shape.ctx)) {
        console.log("You cannot fill a hole with a prefab from a different context.");
        break;
      }
      // fill
      switch (state.ix.top.case) {
        case "sig": state.sig = fillSyn(state.sig, pfb.t, state.ix.steps); break;
        case "imp": state.imp = fillSyn(state.imp, pfb.t, state.ix.steps); break;
        case "pfb": {
          let pfb = state.pfbs[state.ix.top.i];
          switch (state.ix.top.subcase) {
            case "sig": pfb.T = fillSyn(pfb.T, pfb.t, state.ix.steps); break;
            case "imp": pfb.t = fillSyn(pfb.t, pfb.t, state.ix.steps); break;
          }
        }
      }
      // delete used prefab
      state.pfbs.splice(trans.i, 1);
      // unfocus
      state.ix = undefined;
      break;
    }
    case "new prefab": {
      console.log("trans.p:"); console.log(trans.pfb);
      state.pfbs.push(trans.pfb);
      break;
    }
    case "rename": {
      trans.id.lbl = trans.lbl;
      break;
    }
  }
}

export function fillSyn(t: Syn, s: Syn, steps: HoleIxSteps): Syn {
  function go(t: Syn, steps: HoleIxSteps): Syn {
    let sft = shift(steps);
    if (sft !== undefined) {
      let [step, stepsNew] = sft;
      switch (step.case) {
        case "pie": {
          let tPie = t as SynPie;
          switch (step.subcase) {
            case "dom": return {case: "pie", id: tPie.id, dom: go(tPie.dom, stepsNew), cod: tPie.cod};
            case "cod": return {case: "pie", id: tPie.id, dom: tPie.dom, cod: go(tPie.cod, stepsNew)};
          }
          break;
        }
        case "lam": {
          let tLam = t as SynLam;
          return {case: "lam", id: tLam.id, bod: go(tLam.bod, stepsNew)}
        }
        case "let": {
          let tLet = t as SynLet;
          switch (step.subcase) {
            case "dom": return {case: "let", id: tLet.id, dom: go(tLet.dom, stepsNew), arg: tLet.arg, bod: tLet.bod};
            case "arg": return {case: "let", id: tLet.id, dom: tLet.dom, arg: go(tLet.arg, stepsNew), bod: tLet.bod};
            case "bod": return {case: "let", id: tLet.id, dom: tLet.dom, arg: tLet.arg, bod: go(tLet.bod, stepsNew)};
          }
          break;
        }
        case "app": {
          let tApp = t as SynApp;
          switch (step.subcase) {
            case "app": return {case: "app", app: go(tApp.app, stepsNew) as SynNeu, arg: tApp.arg};
            case "arg": return {case: "app", app: tApp.app, arg: go(tApp.arg, stepsNew)};
          }
        }
      }
    } else {
      // substitute here
      return s;
    }
  }
  return go(t, steps);
}