import { len, nil, shift } from "./data/PList";
import { Ctx, eqCtx } from "./language/Ctx";
import { HolePath, HolePathSteps } from "./language/HolePath";
import { infer } from "./language/Inference";
import { HoleShape, mold } from "./language/Molding";
import { evaluate, evaluateTyp, normalize, normalizeTyp, reifyTyp } from "./language/Normalization";
import { SemTyp } from "./language/Semantics";
import { eqSyn, Id, isConcrete, showSyn, Syn, SynApp, SynLam, SynLamNrm, SynLet, SynNeu, SynPie, SynPieNrm, SynTypNrm } from "./language/Syntax";

export type State = {
  sig: Syn; // top-level type
  imp: Syn; // top-level term
  bufs: Buffer[]; // Buffers
  path: HolePath | undefined, // focussed hole path
  trans: Trans | undefined, // selected transition
}

export type Buffer = {
  path: HolePath, // parent hole's path
  t: SynNeu,
}

export type Trans
  = {case: "select", path: HolePath} // select a hole as the new focussed hole
  | {case: "move selection", dir: "left" | "right" | "up" | "down"} // move selection to an adjacent hole
  | {case: "move suggestion", dir: "left" | "right"} // move suggested palette option to adjacent palette option
  | {case: "fill", t: Syn} // fill the focussed hole with a term
  | {case: "submit buffer", i: number} // attempt to fill the focussed hole with the Buffer at index i
  | {case: "delete buffer", i: number} // attempt to fill the focussed hole with the Buffer at index i
  | {case: "new Buffer", buf: Buffer} // create a new Buffer
  | {case: "rename", id: Id, lbl: string} // rename an Id

export function update(state: State, trans: Trans): void {
  console.log("================================================")
  console.log("update");
  console.log("state:"); console.log(state);
  console.log("trans:"); console.log(trans);

  switch (trans.case) {
    case "select": {
      state.path = trans.path;
      break;
    }
    case "move selection": {
      if (state.path === undefined) {
        console.log("You must select a hole before moving.");
        break;
      }
      switch (trans.dir) {
        case "left": {
          break;
        }
        case "right": {
          break;
        }
        case "up": {
          switch (state.path.top.case) {
            case "buf": {
              let buf = state.bufs[state.path.top.i];
              state.path = buf.path;
              break;
            }
            default: {
              console.log("You cannot move up if you are not currently focussed inside of a Buffer.");
              break;
            }
          }
          break;
        }
        case "down": {
          // looks for a Buffer with the same type and context of the current hole
          // TODO
        }
      }
      break;
    }
    case "move suggestion": {
      break;
    }
    case "fill": {
      if (state.path === undefined) {
        console.log("You must select a hole before filling.");
        break;
      }
      switch (state.path.top.case) {
        case "sig": state.sig = fillSyn(state.sig, trans.t, state.path.steps); break;
        case "imp": state.imp = fillSyn(state.imp, trans.t, state.path.steps); break;
        case "buf": {
          let buf = state.bufs[state.path.top.i];
          buf.t = fillSyn(buf.t, trans.t, state.path.steps) as SynNeu;
        }
      }
      // unfocus
      state.path = undefined;
      break;
    }
    case "submit buffer": {
      let buf = state.bufs[trans.i]
      let shape = mold(state, buf.path);
      let Tbuf = infer(buf.t, shape.ctx);
      // check that types matche
      if (!eqSyn(shape.T, Tbuf)) {
        console.log("You cannot fill a hole with a Buffer of a different type.");
        break;
      }
      // check that contexts match
      if (!eqCtx(shape.ctx, shape.ctx)) {
        console.log("You cannot fill a hole with a Buffer from a different context.");
        break;
      }
      // fill
      switch (buf.path.top.case) {
        case "sig": state.sig = fillSyn(state.sig, buf.t, buf.path.steps); break;
        case "imp": state.imp = fillSyn(state.imp, buf.t, buf.path.steps); break;
        case "buf": {
          buf.t = fillSyn(buf.t, buf.t, buf.path.steps) as SynNeu;
        }
      }
      // delete used Buffer
      state.bufs.splice(trans.i, 1);
      // unfocus
      state.path = undefined;
      break;
    }
    case "delete buffer": {
      state.bufs.splice(trans.i, 1);
      break;
    }
    case "new Buffer": {
      console.log("trans.p:"); console.log(trans.buf);
      state.bufs.push(trans.buf);
      break;
    }
    case "rename": {
      trans.id.lbl = trans.lbl;
      break;
    }
  }
}

export function fillSyn(t: Syn, s: Syn, steps: HolePathSteps): Syn {
  function go(t: Syn, steps: HolePathSteps): Syn {
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