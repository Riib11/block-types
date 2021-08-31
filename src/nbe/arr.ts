/*
# Normalization by evaluation for the simply-typed λ-calculus.
*/

import { insert, lookup, nil, PMap } from "../data/PMap";

/*
## Type
*/

type Type
  = {case: "unit"}
  | {case: "arr", dom: Type, cod: Type}
;

function showType(T: Type): string {
  switch (T.case) {
    case "unit": return "*";
    case "arr": return `(${showType(T.dom)} -> ${showType(T.cod)})`;
  }
}

/*
## Semantic domain
*/

type Term
  = {case: "unit"}
  | {case: "lam", id: Id, bod: Term}
  | {case: "let", id: Id, dom: Type, arg: Term, bod: Term}
  | TermNe
;
type TermNe
  = {case: "var", id: Id}
  | {case: "app", app: TermNe, arg: Term}
;

// string for user-given variable ids
// number for generated ids
type Id = string | number;

function showTerm(t: Term): string {
  switch (t.case) {
    case "unit": return "•";
    case "lam": return `(λ ${showId(t.id)} . ${showTerm(t.bod)})`;
    case "let": return `(let ${showId(t.id)} : ${showType(t.dom)} = ${showTerm(t.arg)} in ${showTerm(t.bod)})`;
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

type Sem
  = {case: "lam", id: Id, bod: Sem}
  | ((s: Sem) => Sem)
  | Term
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
    case "unit": return t;
    case "lam": return (s: Sem) => evlImpl(t.bod, insert(G, t.id, s));
    case "var": return lookup(G, t.id);
    case "let": return evlImpl(t.bod, insert(G, t.id, evlImpl(t.arg, G)));
    case "app": return (evlImpl(t.app, G) as (s: Sem) => Sem)(evlImpl(t.arg, G));
  }
}

/*
## Reflection
*/

function rfl(T: Type, t: Term) {
  switch (T.case) {
    case "unit": return t;
    case "arr": return (s: Sem) => rfl(T.cod, {case: "app", app: t as TermNe, arg: rfy(T.dom, s)});
  }
}

/*
## Reification
*/

function rfy(T: Type, t: Sem): Term {
  switch (T.case) {
    case "unit": return t as Term;
    case "arr": {
      let id = freshId();
      return {case: "lam", id, bod: rfy(T.cod, (t as (s: Sem) => Sem)(rfl(T.dom, {case: "var", id})))};
    }
  }
}

/*
## Normalization
*/

export function nrm(T: Type, t: Term): Term
  {return rfy(T, evl(t))}

/*
## Fresh Ids
*/

var freshIdCounter: number = -1;
function freshId(): Id {
  freshIdCounter++;
  return freshIdCounter;
}

/*
## Examples
*/

{
  /*
  expl: * -> *
  expl: λ x . let y : * = x in y
  soln: λ x . x
  */
  let T: Type = {case: "arr", dom: {case: "unit"}, cod: {case: "unit"}};
  let t: Term = {
    case: "lam",
    id: "x",
    bod: {
      case: "let",
      id: "y",
      dom: {case: "unit"},
      arg: {case: "var", id: "x"},
      bod: {case: "var", id: "y"}
    }
  };
  console.log(`${showTerm(t)} ~> ${showTerm(nrm(T, t))} : ${showType(T)}`);
}
