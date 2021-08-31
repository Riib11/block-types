/*
# Normalization by evaluation for the simply-typed λ-calculus with DeBruijn indices.
*/

import { at, cons, nil, PList } from "../data/PList";

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
  | {case: "lam", bod: Term}
  | {case: "let", id: Id, dom: Type, arg: Term, bod: Term}
  | TermNe
;
type TermNe
  = {case: "var", var: Var}
  | {case: "app", app: TermNe, arg: Term}
;

// string for user-given variable ids
// number for generated ids
type Var = number;

function showTerm(t: Term): string {
  switch (t.case) {
    case "unit": return "•";
    case "lam": return `(λ ${showTerm(t.bod)})`;
    case "let": return `(let ${showTerm(t.arg)} : ${showType(t.dom)} in ${showTerm(t.bod)})`;
    case "app":
    case "var": return showTermNe(t);
  }
}

function showTermNe(t: TermNe): string {
  switch (t.case) {
    case "app": return `${showTermNe(t.app)} ${showTerm(t.arg)}`;
    case "var": return showVar(t.var);
  }
}

function showVar(x: Var): string {
  return `#${x.toString()}`;
}

/*
## Semantic domain
*/

type Sem
  = SemTerm
  | ((g: GSem) => Sem)
  | Term
;
type SemTerm
  = {case: "lam", bod: GSem}
  | TermNe
;

type GSem = (ren: Ren) => Sem;

/*
## Context
*/

type Ctx = PList<Sem>;

/*
## Renaming and Substitution
*/

type Ren = (x: Var) => Var;
type Sub = (x: Var) => GSem;


const idRen: Ren = x => x;

const weaken1Ren: Ren = x => x + 1;

function forget1Ren(ren: Ren): Ren
  {return x => ren(x + 1)}

  // TODO: reflect(ctx[x](ren), {case: "var", var: ren(x)});}
function idSub(G: Ctx): Sub
  {return x => ren => "hole"} 

function transRR(ren1: Ren, ren2: Ren): Ren
  {return x => ren2(ren1(x))}

function transSR(sub: Sub, ren1: Ren): Sub
  {return x => ren2 => sub(x)(transRR(ren1, ren2))}

function append1Sub(sub: Sub, g: GSem): Sub
  {return x => x === 0 ? g : sub(x - 1)}

/*
## Evaluation
*/

function evl(t: Term): Sem
  {return evlImpl(idSub(nil()), t)}

function evlImpl(sub: Sub, t: Term): Sem {
  switch (t.case) {
    case "unit": return t;
    case "lam": return (s: GSem) => evlImpl(append1Sub(sub, s), t.bod);
    case "var": return sub(t.var)(idRen);
    case "let": {
      let g: GSem = ren => evlImpl(transSR(sub, ren), t.arg);
      return evlImpl(append1Sub(sub, g), t.bod);
    }
    case "app": return (evlImpl(sub, t.app) as (g: GSem) => Sem)(ren => evlImpl(transSR(sub, ren), t.arg));
  }
}

/*
## Reflection
*/

// TODO: how to generate name for Sem?
function rfl(T: Type, t: TermNe): Sem {
  switch (T.case) {
    case "unit": return t;
    case "arr": return (g: GSem) => rfl(T.cod, {case: "app", app: t, arg: rfy(T.dom, g)});
  }
}

/*
## Reification
*/

// TODO: how to convert from names in Sem to DeB-indices?
function rfy(T: Type, g: GSem): Term {
  switch (T.case) {
    case "unit": {
      let st: SemTerm = g(idRen) as SemTerm;
      switch (st.case) {
        case "lam": {
          return {
            case: "lam",
            bod: "hole"
          }
        }
        case "app":
        case "var": return st;
      }
    }
    case "arr": {
      return {case: "lam", bod: rfy(T.cod, (t as (s: Sem) => Sem)(rfl(T.dom, {case: "var", var: "hole"})))};
    }
  }
}

/*
## Normalization
*/

export function nrm(T: Type, t: Term): Term
  {return rfy(T, evl(t))}

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
    bod: {
      case: "let",
      dom: {case: "unit"},
      arg: {case: "var", var: 0},
      bod: {case: "var", var: 0}
    }
  };
  console.log(`${showTerm(t)} ~> ${showTerm(nrm(T, t))} : ${showType(T)}`);
}
