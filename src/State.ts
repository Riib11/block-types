import { len, nil, shift } from "./data/PList";
import { Ctx, eqCtx } from "./language/Ctx";
import { popState, pushState } from "./language/History";
import { Path, PathSteps, movePath, stepPath, walkPath } from "./language/Path";
import { infer } from "./language/Inference";
import { HoleShape, mold } from "./language/Molding";
import { evaluate, evaluateTyp, normalize, normalizeTyp, reifyTyp } from "./language/Normalization";
import { SemTyp } from "./language/Semantics";
import { eqSyn, Id, isConcrete, showSyn, Syn, SynApp, SynLam, SynLamNrm, SynLet, SynNeu, SynPie, SynPieNrm, SynTypNrm } from "./language/Syntax";
import { genPalette } from "./language/Palette";

export type State = {
  sig: Syn; // top-level type
  imp: Syn; // top-level term
  bufs: Buffer[]; // Buffers
  path: Path | undefined, // focussed path
  plt: Palette, // palette of some possible transitions
}

export type Palette = {
  items: Tran[],
  i: number | undefined,
}

export type Buffer = {
  path: Path, // parent hole's path
  t: SynNeu,
}

export type Tran
  = {case: "select", path: Path} // select a hole as the new focussed hole
  | {case: "move selection", dir: "left" | "right" | "up" | "down"} // move selection to an adjacent hole
  | {case: "move suggestion", dir: "up" | "down"} // move suggested palette option to adjacent palette option
  | {case: "fill", t: Syn} // fill the focussed hole with a term
  | {case: "submit buffer", i: number} // attempt to fill the focussed hole with the Buffer at index i
  | {case: "delete buffer", i: number} // attempt to fill the focussed hole with the Buffer at index i
  | {case: "create buffer", buf: Buffer} // create a new Buffer
  | {case: "rename", id: Id, lbl: string} // rename an Id
  | {case: "undo"}

export function update(state: State, trans: Tran): State {
  console.log("================================================")
  console.log("update");
  console.log("state:"); console.log(state);
  console.log("trans:"); console.log(trans);

  switch (trans.case) {
    case "select": {
      state.path = trans.path;
      regenPalette(state);
      break;
    }
    case "move selection": {
      if (state.path === undefined) {
        console.log("You must select a hole before moving.");
        break;
      }
      state.path = movePath(state.path, trans.dir, state);
      regenPalette(state);
      break;
    }
    case "move suggestion": {
      if (state.plt.items.length > 0) {
        if (state.plt.i !== undefined) {
          switch (trans.dir) {
            case "up": state.plt.i = (state.plt.i - 1 + state.plt.items.length) % state.plt.items.length; break;
            case "down": state.plt.i = (state.plt.i + 1) % state.plt.items.length; break;
          }
        } else {
          switch (trans.dir) {
            case "up": state.plt.i = 0; break;
            case "down": state.plt.i = state.plt.items.length - 1; break;
          }
        }
      }
      break;
    }
    case "fill": {
      if (state.path === undefined || !isSelectingHole(state)) {
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
      // refocus
      switch (trans.t.case) {
        case "uni": state.path = movePath(state.path, "up", state); break;
        case "pie": state.path = stepPath(state.path, {case: "pie", subcase: "dom"}); break;
        case "lam": state.path = stepPath(state.path, {case: "lam"}); break;
        case "let": state.path = stepPath(state.path, {case: "let", subcase: "dom"}); break;
        case "app": state.path = stepPath(state.path, {case: "app", subcase: "app"}); break;
        case "var": state.path = movePath(state.path, "up", state); break;
        case "hol": throw new Error("Impossible because a hole cannot be filed with a hole.");
      }
      regenPalette(state);
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
      // refocus
      state.path = movePath(buf.path, "up", state);
      regenPalette(state);
      break;
    }
    case "delete buffer": {
      state.bufs.splice(trans.i, 1);
      break;
    }
    case "create buffer": {
      console.log("trans.p:"); console.log(trans.buf);
      state.bufs.push(trans.buf);
      state.path = {top: {case: "buf", i: state.bufs.length - 1}, steps: nil()};
      regenPalette(state);
      break;
    }
    case "rename": {
      trans.id.lbl = trans.lbl;
      break;
    }
    case "undo": {
      // TODO
      // let stateOld = popState();
      // console.log(stateOld);
      // return stateOld !== undefined ? stateOld : state;
    }
  }

  // Cache state in history
  // pushState(state); // TODO
  
  console.log("state after"); console.log(state);
  return state;
}

export function fillSyn(t: Syn, s: Syn, steps: PathSteps): Syn {
  function go(t: Syn, steps: PathSteps): Syn {
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

export function isSelectingHole(state: State): boolean {
  return state.path !== undefined ? walkPath(state.path, state).case === "hol" : false;
}

export function regenPalette(state: State): void {
  if (state.path !== undefined) {
    // Regenerate new palette
    let shape = mold(state, state.path);
    state.plt.items = genPalette(shape);
  }
}