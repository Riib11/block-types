import { getHoleIds, HoleId, Id, Prgm, renameId, Syn, SynNeu } from "./language/Syntax";

export type State = {
  p: Prgm, // current program
  id: HoleId | undefined // focussed HoleId or unfocussed
};

export type Trans
  = {case: "fill", id: HoleId, t: Syn}
  | {case: "select", id: HoleId}
  | {case: "rename", id: Id, lbl: string}
;

export function update(state: State, trans: Trans): State {
  switch (trans.case) {
    case "fill": {
      if (state.id !== undefined) {
        console.log(`update: fill hole ${trans.id.uid} with ${trans.t.case}`)
        let holeIx = getHoleIds(state.p).indexOf(state.id);
        let p = fillHole(state.p, trans.id, trans.t);
        let holeIds = getHoleIds(p);
        let id = holeIds.length !== 0 ? holeIds[holeIx] : undefined;
        return {
          p,
          id
        }
      } else return state;
    }
    case "select": {
      console.log(`update: select hole ${trans.id.uid}`);
      return {
        p: state.p,
        id: trans.id
      }
    }
    case "rename": {
      console.log(`rename: from ${trans.id.lbl} to ${trans.lbl}`);
      trans.id.lbl = trans.lbl;
      return {
        p: state.p,
        id: undefined
      }
    }
  }
}

export function fillHole(p: Prgm, id: HoleId, a: Syn): Prgm {
  function goSynNeu(t: SynNeu): SynNeu {
    switch (t.case) {
      case "var": return t;
      case "app": return {case: "app", app: goSynNeu(t.app), arg: goSyn(t.arg)};
    }
  }
  function goSyn(t: Syn): Syn {
    switch (t.case) {
      case "uni": return t;
      case "pie": return {case: "pie", id: t.id, dom: goSyn(t.dom), cod: goSyn(t.cod)};
      case "lam": return {case: "lam", id: t.id, bod: goSyn(t.bod)};
      case "let": return {case: "let", id: t.id, dom: goSyn(t.dom), arg: goSyn(t.arg), bod: goSyn(t.bod)};
      case "hol": return (t.id === id)? a : t;
      case "app":
      case "var": return goSynNeu(t)
    }
  }
  switch (p.case) {
    case "jud": return {case: "jud", t: goSyn(p.t), T: goSyn(p.T)};
  }
}