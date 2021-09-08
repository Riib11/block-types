/*
For the dependently-typed λ-calculus with DeBruijn levels
*/

import * as PList from "../data/PList";

/*
## Syntactic domain
*/

type Syn    = SynUni | SynPie | SynLam | SynNe | SynLet | SynHol;
type SynNe  = SynApp | SynVar // neutral
type SynUni = {case: "uni", lvl: Level}; // universe
type SynPie = {case: "pie", id: Id, dom: Syn, cod: Syn}; // Π
type SynLam = {case: "lam", id: Id, bod: Syn}; // λ
type SynApp = {case: "app", app: SynNe, arg: Syn}; // application
type SynVar = {case: "var", dbl: Dbl}; // variable
type SynLet = {case: "let", id: string, dom: Syn, arg: Syn, bod: Syn}; // let
type SynHol = {case: "hol", id: HoleId}; // ?

type Level = number; // level
type Id = string; // identifier
type Dbl = number; // DeBruijn level
type HoleId = {};

function showSyn(t: Syn): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "pie": return `Π ${t.id} : ${showSyn(t.dom)} . ${showSyn(t.cod)}`;
    case "lam": return `λ ${t.id} . ${showSyn(t.bod)}`;
    case "let": return `let ${t.id} : ${showSyn(t.dom)} = ${showSyn(t.arg)} in ${showSyn(t.bod)}`;
    case "hol": return `?`;
    case "app": return `(${showSynNe(t)})`;
    case "var": return showSynNe(t);
  }
}

function showSynNe(t: SynNe): string {
  switch (t.case) {
    case "app": return `${showSynNe(t.app)} ${showSyn(t.arg)}`;
    case "var": return `#${t.dbl}`;
  }
}

/*
## Semantic domain
*/

// Semantic
type Sem = SemTyp | SemArr | Syn;
type SemTyp = SynUni | SemPi | SynNe | SynHol;
type SemArr = (t: Sem) => Sem;
type SemPi = {case: "pie", id: Id, dom: SemTyp, bod: SemArr}

/*
## Normalization by evaluation
*/

type Ctx = PList.PList<Sem>;

function evaluate(t: Syn, ctx: Ctx = PList.nil()): Sem {
  switch (t.case) {
    case "uni": return t;
    case "pie": return {
      case: "pie",
      id: t.id,
      dom: evaluate(t.dom, ctx) as SemTyp,
      bod: (a: Sem) => evaluate(t.cod, PList.cons(a, ctx as Ctx))
    };
    case "lam": return (a: Sem) => evaluate(t.bod, PList.cons(a, ctx as Ctx));
    case "let": return evaluate(t.bod, PList.cons(evaluate(t.arg, ctx), ctx));
    case "hol": return t;
    case "app": return (evaluate(t.app, ctx) as (s: Sem) => Sem)(evaluate(t.arg, ctx));
    case "var": return PList.atRev(t.dbl, ctx) as Sem;
  }
}

function reflect(T: SemTyp, t: SynNe, dbl: Dbl = 0): Sem {
  switch (T.case) {
    case "uni": return t;
    case "pie": return (a: Sem) => 
      reflect(
        T.bod(a) as SemTyp,
        {case: "app", app: t, arg: reify(T.dom as SemTyp, a, dbl)},
        dbl + 1
      );
    case "hol":
    case "app":
    case "var": return t;
  }
}

function reify(T: SemTyp, t: Sem, dbl: Dbl = 0): Syn {
  switch (T.case) {
    case "uni": {
      let tTyp: SemTyp = t as SemTyp;
      switch (tTyp.case) {
        case "uni": return tTyp;
        case "pie": return {
          case: "pie",
          id: tTyp.id,
          dom: reify({case: "uni", lvl: T.lvl}, tTyp.dom, dbl),
          cod: reify({case: "uni", lvl: T.lvl}, tTyp.bod(reflect(tTyp.dom, {case: "var", dbl}, dbl + 1)), dbl + 1)
        }
        case "hol": 
        case "app":
        case "var": return tTyp;
      }
      break;
    }
    case "pie": return {
      case: "lam",
      id: T.id,
      bod:
        reify(
          T.bod(reflect(T.dom, {case: "var", dbl}, dbl + 1)) as SemTyp,
          (t as (a: Sem) => Sem)(reflect(T.dom, {case: "var", dbl}, dbl + 1))
        )
    }
    case "hol":
    case "app":
    case "var": return t as Syn;
  }
}

function normalize(T: Syn, t: Syn): Syn
  {return reify(evaluate(T) as SemTyp, evaluate(t))}

// T: syntactic type
function normalizeTyp(T: Syn): Syn
  {return normalize({case: "uni", lvl: -1}, T)}

/*
## Molding

Analogy: making a mold. The molding material is poured into the term, which
seeps into the "shapes" (i.e. type & context) of the holes.

TODO: should the HoleShape store the type as a SemTyp or a Syn??
*/

type HoleCtx = PList.PList<SemTyp>;
type HoleShape = [SemTyp, HoleCtx];

function mold(T: Syn, t: Syn): Map<HoleId, HoleShape> {
  let shapes: Map<HoleId, HoleShape> = new Map();

  function goSem(T: SemTyp, t: Sem, ctx: HoleCtx = PList.nil()): void {
    switch (T.case) {
      case "uni": {
        let tTyp: SemTyp = t as SemTyp;
        switch (tTyp.case) {
          case "uni": return;
          case "pie": {
            goSem(T, tTyp.dom, ctx);
            goSem(
              T,
              tTyp.bod(reflect(tTyp.dom, {case: "var", dbl: PList.len(ctx)})) as SemTyp,
              PList.cons(tTyp.dom, ctx)
            ); 
            return;
          }
          case "app": goApp(tTyp, ctx); return;
          case "var": return;
          case "hol": shapes.set(tTyp.id, [T, ctx]); return;
        }
        break;
      }
      case "pie": {
        goSem(
          T.bod(reflect(T.dom, {case: "var", dbl: PList.len(ctx)})) as SemTyp,
          (t as SemArr)(reflect(T.dom, {case: "var", dbl: PList.len(ctx)})),
          PList.cons(T.dom, ctx)
        );
        return;
      }
      // TODO: smthng probs wrong here... what does `goApp(T, ctx, dbl)` look like?
      case "app": goSem(goApp(T, ctx), t, ctx); return;
      case "var": return;
      // You cannot inspect a term before it's type hole is filled
      case "hol": shapes.set(T.id, [{case: "uni", lvl: -1}, ctx]); 
    }
  }

  function goApp(t: SynNe, ctx: HoleCtx): SemTyp {
    function go(t: SynNe, ctx: HoleCtx): SemPi {
      switch (t.case) {
        case "app": {
          let F: SemPi = go(t.app, ctx);
          goSem(F.dom, t.arg, ctx);
          return F.bod(t.arg) as SemPi;
        }
        case "var": return PList.atRev(t.dbl, ctx) as SemPi;
      }
    }
    switch (t.case) {
      case "app": {
        let F: SemPi = go(t.app, ctx);
        goSem(F.dom, t.arg, ctx);
        return F.bod(t.arg) as SemTyp;
      }
      case "var": return PList.atRev(t.dbl, ctx) as SemTyp;
    }
  }

  goSem(evaluate(T) as SemTyp, evaluate(t));
  return shapes;
}