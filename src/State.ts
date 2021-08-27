import { HoleId, Neu, Prgm, Term } from "./language/Syntax";

export type State = {
  p: Prgm, // current program
  id: HoleId | undefined // focussed HoleId or unfocussed
};

export type Trans
  = {case: "fill", id: HoleId, term: Term}
  | {case: "select", id: HoleId}
;

export function update(state: State, trans: Trans): State {
  switch (trans.case) {
    case "fill": {
      console.log(`update: fill hole ${trans.id.ix} with ${trans.term.case}`)
      return {
        p: fillHole(state.p, trans.id, trans.term),
        id: undefined
      }
    }
    case "select": {
      console.log(`update: select hole ${trans.id.ix}`);
      return {
        p: state.p,
        id: trans.id
      }
    }
  }
}

export function fillHole(p: Prgm, id: HoleId, a: Term): Prgm {
  function goNeu(neu: Neu): Neu {
    switch (neu.case) {
      case "var": return neu;
      case "app": return {case: "app", app: goNeu(neu.app), arg: goTerm(neu.arg)};
    }
  }
  function goTerm(t: Term): Term {
    switch (t.case) {
      case "uni": return t;
      case "pi": return {case: "pi", id: t.id, dom: goTerm(t.dom), bod: goTerm(t.bod)};
      case "lam": return {case: "lam", bod: goTerm(t.bod)};
      case "neu": return {case: "neu", neu: goNeu(t.neu)};
      case "let": return {case: "let", id: t.id, dom: goTerm(t.dom), arg: goTerm(t.arg), bod: goTerm(t.bod)};
      case "hol": return (t.id === id)? a : t;
    }
  }
  switch (p.case) {
    case "jud": return {case: "jud", term: goTerm(p.term), type: goTerm(p.type)};
  }
}