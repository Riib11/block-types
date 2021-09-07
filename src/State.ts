import { len } from "./data/PList";
import { infer } from "./language/Inference";
import { HoleCtx, HoleShape, mold } from "./language/Molding";
import { evaluate, evaluateTyp, reifyTyp } from "./language/Normalization";
import { SemTyp } from "./language/Semantics";
import { eqSyn, getHoleIds, HoleId, Id, Prgm, renameId, showSyn, Syn, SynApp, SynNeu } from "./language/Syntax";

export type State = {
  p: Prgm, // program
  foc: Focus | undefined // focus
};

export type Buffer = {
  t: SynApp, // buffer term
  foc: Focus | undefined, // focus (inside of buffer term)
}

// TODO: Right now, I aim to support 1 main focus and 1 subfocus, but eventually
// you should be able to have any number of subfocusses.
export type Focus = {
  id: HoleId,// focussed hole id
  ctx: HoleCtx,  // focussed hole's context
  T: SemTyp, // hole type
  buf: Buffer | undefined;
}

export type Trans
  = {case: "fill", t: Syn} // fill the focussed hole
  | {case: "buffer create", t: SynApp} // open a buffer for the focussed hole
  | {case: "buffer submit"} // submit the buffer into the focussed hole
  | {case: "select", id: HoleId} // select a hole to focus
  | {case: "rename", id: Id, lbl: string} // rename an Id
;

export function update(state: State, trans: Trans): void {
  console.log("================================================")
  console.log("update");
  console.log("state:"); console.log(state);
  console.log("trans:"); console.log(trans);

  switch (trans.case) {
    case "fill": {
      if (state.foc !== undefined) {
        console.log(`update: fill hole ${state.foc.id.uid} with ${trans.t.case}`)
        // fill hole in program (top-level)
        if (state.foc !== undefined && state.foc.buf === undefined) {
          state.p = fillHolePrgm(state.p, state.foc.id, trans.t);
        }
        // fill hole in subfocus
        else if (state.foc !== undefined && state.foc.buf !== undefined && state.foc.buf.foc !== undefined) {
          state.foc.buf.t = fillHoleSyn(state.foc.buf.t, state.foc.buf.foc.id, trans.t) as SynApp;;
          state.foc.buf.foc = undefined;
        }
      }
      break;
    }
    case "buffer create": {
      if (state.foc === undefined) {console.log("You tried create a buffer without selecting a hole first."); break}
      if (state.foc.buf === undefined) {console.log("You tried create a buffer while another buffer is still active."); break}
      state.foc.buf = {t: trans.t, foc: undefined};
      break;
    }
    case "buffer submit": {
      if (state.foc === undefined) {console.log("You tried to submit a buffer without selecting a hole first."); break}
      if (state.foc.buf === undefined) {console.log("You tried to submit a buffer while no buffer is active."); break;}
      let S1 = infer(state.foc.buf.t, state.foc.ctx);
      let S2 = state.foc.T;
      let T1 = reifyTyp(S1, len(state.foc.ctx));
      let T2 = reifyTyp(S2, len(state.foc.ctx));
      if (!eqSyn(T1, T2)) {console.log("You tried to submit buffer with wrong type."); break}
      state.p = fillHolePrgm(state.p, state.foc.id, state.foc.buf.t);
      state.foc = undefined;
      break;
    }
    case "select": {
      // select hole in program
      if (state.foc === undefined || (state.foc !== undefined && state.foc.buf === undefined)) {
        let shape = mold(evaluateTyp(state.p.T), state.p.t).get(trans.id) as HoleShape;
        state.foc = {
          id: trans.id,
          ctx: shape.ctx,
          T: shape.T,
          buf: undefined
        }
      }
      // select hole in buffer
      else {
        let buf = getBuf(state) as Buffer;
        let shape = mold(evaluateTyp())
        
      }
      break;

      let foc = getFoc(state);
      if (foc === undefined) {
        
      } else {
        let shape = mold(evaluate("hole", ))
      }


      // if (state.foc === undefined || (state.foc !== undefined && state.foc.buf === undefined)) {
      //   let shape = mold(evaluate(state.p.T) as SemTyp, state.p.t).get(trans.id) as HoleShape;
      //   state.foc = {
      //     id: trans.id,
      //     ctx: shape.ctx,
      //     T: shape.T,
      //     buf: undefined
      //   };
      //   break;
      // } else if (state.foc !== undefined && state.foc.buf !== undefined) {
      //   let shape = mold(state.foc.T, state.foc.buf.t).get(trans.id);
      //   if (shape !== undefined) {
      //     return {
      //       p: state.p,
      //       foc: {
      //         id: state.foc.id,
      //         ctx: state.foc.ctx,
      //         T: state.foc.T,
      //         buf: {
      //           t: state.foc.buf.t,
      //           foc: {
      //             id: trans.id,
      //             ctx: shape.ctx,
      //             T: shape.T,
      //             buf: undefined
      //           }
      //         }
      //       }
      //     }
      //   } else {
      //     console.log("You tried to select a hole outside of the current buffer.");
      //     return state
      //   }
      // } else {
      //   console.log("You tried to select a hole invalidly.");
      //   return state
      // }
    }
    case "rename": {
      console.log(`rename: from ${trans.id.lbl} to ${trans.lbl}`);
      trans.id.lbl = trans.lbl;
      return {
        p: state.p,
        foc: state.foc
      }
    }
    default: return state;
  }
}

export function fillHoleSyn(t: Syn, id: HoleId, s: Syn): Syn {
  switch (t.case) {
    case "uni": return t;
    case "pie": return {case: "pie", id: t.id, dom: fillHoleSyn(t.dom, id, s), cod: fillHoleSyn(t.cod, id, s)};
    case "lam": return {case: "lam", id: t.id, bod: fillHoleSyn(t.bod, id, s)};
    case "let": return {case: "let", id: t.id, dom: fillHoleSyn(t.dom, id, s), arg: fillHoleSyn(t.arg, id, s), bod: fillHoleSyn(t.bod, id, s)};
    case "hol": return (t.id === id)? s : t;
    case "app": return {case: "app", app: fillHoleSyn(t.app, id, s) as SynNeu, arg: fillHoleSyn(t.arg, id, s)};
    case "var": return t;
  }
}

export function fillHolePrgm(p: Prgm, id: HoleId, t: Syn): Prgm {
  return {t: fillHoleSyn(p.t, id, t), T: fillHoleSyn(p.T, id, t)};
}

export function getFoc(state: State): Focus | undefined {
  if (state.foc === undefined) {
    return undefined;
  } else {
    let foc: Focus = state.foc;
    while (foc.buf !== undefined && foc.buf.foc !== undefined) {
      foc = foc.buf.foc;
    }
    return foc;
  }
}

export function getBuf(state: State): Buffer | undefined {
  if (state.foc === undefined || (state.foc !== undefined && state.foc.buf === undefined)) {
    return undefined;
  }
  else {
    let buf: Buffer = state.foc.buf as Buffer;
    while (buf.foc !== undefined && buf.foc.buf !== undefined) {
      buf = buf.foc.buf;
    }
    return buf;
  }
}