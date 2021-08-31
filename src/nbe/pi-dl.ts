// TODO: migrate this into language/Normalization as our canonical impl, since this is so much nicer!

/*
# Normalization by evaluation for the dependently-typed λ-calculus with DeBruijn levels.
*/

import { atRev, cons, nil, PList, showPList } from "../data/PList";

/*
## Semantic domain
*/

type Term
  = {case: "uni", lvl: Lvl}
  | {case: "lam", id: Id, bod: Term}
  | {case: "pi", id: Id, dom: Term, bod: Term}
  | {case: "let", id: Id, dom: Term, arg: Term, bod: Term}
  | TermNe
;
type TermNe
  = {case: "var", ix: Ix}
  | {case: "app", app: TermNe, arg: Term}
;

type Lvl = number;

type Ix = number; // DeBruijn level
type Id = string;

function showTerm(t: Term): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "lam": return `(λ ${showId(t.id)} . ${showTerm(t.bod)})`;
    case "pi": return `(Π ${showId(t.id)} : ${showTerm(t.dom)} . ${showTerm(t.bod)})`;
    case "let": return `(let ${showId(t.id)} : ${showTerm(t.dom)} = ${showTerm(t.arg)} in ${showTerm(t.bod)})`;
    case "app":
    case "var": return showTermNe(t);
  }
}

function showTermNe(t: TermNe): string {
  switch (t.case) {
    case "app": return `${showTermNe(t.app)} ${showTerm(t.arg)}`;
    case "var": return showIx(t.ix);
  }
}

function showId(id: Id): string {
  return id;
}

function showIx(ix: Ix): string {
  return `#${ix.toString()}`;
}

/*
## Semantic domain
*/

type Sem = SemT | ((s: Sem) => Sem) | Term;

type SemT
  = {case: "uni", lvl: Lvl}
  | {case: "pi", id: Id, dom: Sem, bod: (s: Sem) => Sem}
  | TermNe
;

/*
## Context
*/

type Ctx = PList<Sem>;

/*
## Evaluation
*/

function evl(t: Term): Sem
  {return evlImpl(t, nil())}

function evlImpl(t: Term, G: Ctx): Sem {
  switch (t.case) {
    case "uni": return t;
    case "lam": return (s: Sem) => evlImpl(t.bod, cons(s, G));
    case "pi": return {
      case: "pi",
      id: t.id,
      dom: evlImpl(t.dom, G),
      bod: (s: Sem) => evlImpl(t.bod, cons(s, G))
    }
    case "var": {
      console.log(showPList(G, (s: Sem) => typeof(s)));
      return atRev(t.ix, G);
    }
    case "let": return evlImpl(t.bod, cons(evlImpl(t.arg, G), G));
    case "app": return (evlImpl(t.app, G) as (s: Sem) => Sem)(evlImpl(t.arg, G));
  }
}

/*
## Reflection
*/

// d: depth
function rfl(T: SemT, t: TermNe, d: number): Sem {
  switch (T.case) {
    case "uni": return t;
    case "pi": return (s: Sem) =>
                rfl(T.bod(s) as SemT, 
                    {case: "app", app: t, arg: rfy(T.dom as SemT, s, d)}, d + 1);
    case "app":
    case "var": return t;
  }
}

/*
## Reification
*/

// d: depth 
function rfy(T: SemT, t: Sem, d: number): Term {
  switch (T.case) {
    case "uni": {
      let tT: SemT = t as SemT;
      switch (tT.case) {
        case "uni": return {case: "uni", lvl: tT.lvl};
        case "pi": {
          let A: Sem = tT.dom;
          let B: (s: Sem) => Sem = tT.bod;
          return {
            case: "pi",
            id: tT.id,
            dom: rfy({case: "uni", lvl: T.lvl}, A, d),
            bod: rfy({case: "uni", lvl: T.lvl}, B(rfl(A as SemT, {case: "var", ix: d}, d + 1)), d)
          };
        }
        case "app":
        case "var": return tT;
      }
      break;
    }
    case "pi": {
      let A: Sem = T.dom;
      let B: (s: Sem) => Sem = T.bod;
      return {
        case: "lam",
        id: T.id,
        bod: rfy(B(rfl(A as SemT, {case: "var", ix: d}, d)) as SemT,
                 (t as (s: Sem) => Sem)(rfl(A as SemT, {case: "var", ix: d}, d)),
                 d)
      }
    }
    case "app":
    case "var": return t as Term;
  }
}

/*
## Normalization
*/

export function nrm(T: Term, t: Term): Term
  {return rfy(evl(T) as SemT, evlImpl(t, nil()), 0)}

/*
## Examples
*/

{
  /*
  expl: * -> *
  expl: λ x . let y : * = x in y
  soln: λ x . x
  */
  let T: Term = {case: "pi", id: "A", dom: {case: "uni", lvl: 0}, bod: {case: "uni", lvl: 0}};
  let t: Term = {
    case: "lam",
    id: "A",
    bod: {
      case: "let",
      id: "B",
      dom: {case: "uni", lvl: 0},
      arg: {case: "var", ix: 0},
      bod: {case: "var", ix: 1}
    }
  };
  console.log(`${showTerm(t)} ~> ${showTerm(nrm(T, t))} : ${showTerm(T)}`);
}
