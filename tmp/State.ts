import { len } from "./data/PList";
import { infer } from "./language/Inference";
import { Ctx, HoleShape, mold } from "./language/Molding";
import { evaluate, evaluateTyp, normalize, normalizeTyp, reifyTyp } from "./language/Normalization";
import { SemTyp } from "./language/Semantics";
import { eqSyn, hasHoleId, HoleId, Id, showSyn, Syn, SynApp, SynNeu, SynTypNrm } from "./language/Syntax";

export type State = {
  sig: Buffer;
  imp: Buffer;
}

export type Focus = {
  id: HoleId,// focussed hole id
  ctx: Ctx,  // focussed hole's context
  T: SynTypNrm, // hole type
  buf: Buffer | undefined;
}

export type Buffer
  = {case: "top", T: Syn, t: Syn, foc: Focus | undefined}
  | {case: "app", T: Syn, t: SynApp, foc: Focus | undefined}

export type Trans
  = {case: "fill", t: Syn} // fill the focussed hole
  | {case: "buffer create", t: SynApp} // open a buffer for the focussed hole
  | {case: "buffer submit"} // submit the buffer into the focussed hole
  | {case: "select", id: HoleId} // select a hole to focus
  | {case: "rename", id: Id, lbl: string} // rename an Id

export function update(state: State, trans: Trans): void {
  console.log("================================================")
  console.log("update");
  console.log("state:"); console.log(state);
  console.log("trans:"); console.log(trans);

  switch (trans.case) {
    case "select": {
      // try sig
      {
        let buf = getBuf(state.sig);
        if (hasHoleId(trans.id, buf.t)) {
          let shape = mold(normalizeTyp(buf.T), normalize(buf.T, buf.t)).get(trans.id) as HoleShape;
          buf.foc = {
            id: trans.id,
            ctx: shape.ctx,
            T: shape.T,
            buf: undefined
          }
          break;
        }
      }
      // try imp
      {
        let buf = getBuf(state.imp);
        if (hasHoleId(trans.id, buf.t)) {
          let shape = mold(normalizeTyp(buf.T), normalize(buf.T, buf.t)).get(trans.id) as HoleShape;
          buf.foc = {
            id: trans.id,
            ctx: shape.ctx,
            T: shape.T,
            buf: undefined
          }
          break;
        }
      }
      break;
    }
    case "buffer create": {
      break;
    }
    case "buffer submit": {
      break;
    }
    case "fill": {
      break;
    }
    case "rename": {
      break;
    }
  }
}

function getBuf(buf: Buffer): Buffer {
  while (buf.foc !== undefined && buf.foc.buf !== undefined)
    buf = buf.foc.buf;
  return buf;
}