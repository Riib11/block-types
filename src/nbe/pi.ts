/*
# Normalization by evaluation for the dependently-typed λ-calculus.
*/

import { insert, lookup, nil, PMap } from "../data/PMap";

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
  = {case: "var", id: Id}
  | {case: "app", app: TermNe, arg: Term}
;

type Lvl = number;

// string for user-given variable ids
// number for generated ids
type Id = string | number;

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
    case "var": return showId(t.id);
  }
}

function showId(id: Id): string {
  switch (typeof(id)) {
    case "string": return id;
    case "number": return `#${id.toString()}`;
  }
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

type Ctx = PMap<Id, Sem>;

/*
## Evaluation
*/

function evl(t: Term): Sem
  {return evlImpl(t, nil())}

function evlImpl(t: Term, G: Ctx): Sem {
  switch (t.case) {
    case "uni": return t;
    case "lam": return (s: Sem) => evlImpl(t.bod, insert(G, t.id, s));
    case "pi": return {
      case: "pi",
      id: t.id,
      dom: evlImpl(t.dom, G),
      bod: (s: Sem) => evlImpl(t.bod, insert(G, t.id, s))
    }
    case "var": return lookup(G, t.id);
    case "let": return evlImpl(t.bod, insert(G, t.id, evlImpl(t.arg, G)));
    case "app": return (evlImpl(t.app, G) as (s: Sem) => Sem)(evlImpl(t.arg, G));
  }
}

/*
## Reflection
*/

function rfl(T: SemT, t: TermNe): Sem {
  switch (T.case) {
    case "uni": return t;
    case "pi": return (s: Sem) =>
                rfl(T.bod(s) as SemT, 
                    {case: "app", app: t, arg: rfy(T.dom as SemT, s)});
    case "app":
    case "var": return t;
  }
}

/*
## Reification
*/

function rfy(T: SemT, t: Sem): Term {
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
            dom: rfy({case: "uni", lvl: T.lvl}, A),
            bod: rfy({case: "uni", lvl: T.lvl}, B(rfl(A as SemT, {case: "var", id: tT.id})))
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
        bod: rfy(B(rfl(A as SemT, {case: "var", id: T.id})) as SemT,
                 (t as (s: Sem) => Sem)(rfl(A as SemT, {case: "var", id: T.id})))
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
  {return rfy(evl(T) as SemT, evlImpl(t, nil()))}

/*
## Fresh Ids
*/

// TODO: I never actually need this, because where it was needed in `rfy` for STLC, I can now use the name bound in the Π type instead
// TODO: Unfortunately, I don't seen an obvious way to eliminate the name from the λ term. This is because I need to use the name to create the semantic function in `evlImpl` for the λ case. I can't make the type an argument of `evl` since I use `evl` on the given type for `nrm`, so requiring the type of that type would be a vicious regress :(
// var freshIdCounter: number = -1;
// function freshId(): Id {
//   freshIdCounter++;
//   return freshIdCounter;
// }

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
      arg: {case: "var", id: "A"},
      bod: {case: "var", id: "B"}
    }
  };
  console.log(`${showTerm(t)} ~> ${showTerm(nrm(T, t))} : ${showTerm(T)}`);
}
