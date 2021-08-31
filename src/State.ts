import { assert } from "console";
import { getHoleIds, HoleId, Id, Prgm, renameId, Term, TermNe } from "./language/Syntax";

export type State = {
  p: Prgm, // current program
  id: HoleId | undefined // focussed HoleId or unfocussed
};

export type Trans
  = {case: "fill", id: HoleId, term: Term}
  | {case: "select", id: HoleId}
  | {case: "rename", id: Id, lbl: string}
;

export function update(state: State, trans: Trans): State {
  switch (trans.case) {
    case "fill": {
      if (state.id !== undefined) {
        console.log(`update: fill hole ${trans.id.ix} with ${trans.term.case}`)
        let holeIx = getHoleIds(state.p).indexOf(state.id);
        let p = fillHole(state.p, trans.id, trans.term);
        let holeIds = getHoleIds(p);
        let id = holeIds.length !== 0 ? holeIds[holeIx] : undefined;
        return {
          p,
          id
        }
      } else return state;
    }
    case "select": {
      console.log(`update: select hole ${trans.id.ix}`);
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

export function fillHole(p: Prgm, id: HoleId, a: Term): Prgm {
  function goTermNe(t: TermNe): TermNe {
    switch (t.case) {
      case "var": return t;
      case "app": return {case: "app", app: goTermNe(t.app), arg: goTerm(t.arg)};
    }
  }
  function goTerm(t: Term): Term {
    switch (t.case) {
      case "uni": return t;
      case "pi": return {case: "pi", id: t.id, dom: goTerm(t.dom), bod: goTerm(t.bod)};
      case "lam": return {case: "lam", bod: goTerm(t.bod)};
      case "let": return {case: "let", id: t.id, dom: goTerm(t.dom), arg: goTerm(t.arg), bod: goTerm(t.bod)};
      case "hol": return (t.id === id)? a : t;
      case "app":
      case "var": return goTermNe(t)
    }
  }
  switch (p.case) {
    case "jud": return {case: "jud", term: goTerm(p.term), type: goTerm(p.type)};
  }
}