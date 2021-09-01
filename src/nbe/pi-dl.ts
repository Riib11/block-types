// TODO: migrate this into language/Normalization as our canonical impl, since this is so much nicer!

/*
# Normalization by evaluation for the dependently-typed λ-calculus with DeBruijn levels.
*/

import * as PList from "../data/PList";
import * as PMap from "../data/PMap";

/*
## Syntactic domain
*/

// Syntactic term

type SynTrm    = SynTrmNrm | SynTrmLet;
type SynTrmNrm = SynTrmUni | SynTrmPie | SynTrmLam | SynTrmNeu | SynTrmHol;
type SynTrmNeu = SynTrmApp | SynTrmVar;

type SynTrmUni = {case: "uni", lvl: Lvl};
type SynTrmPie = {case: "pie", id: Id, dom: SynTrm, bod: SynTrm};
type SynTrmLam = {case: "lam", id: Id, bod: SynTrm};
type SynTrmApp = {case: "app", app: SynTrmNeu, arg: SynTrm}
type SynTrmVar = {case: "var", ix: Ix};
type SynTrmLet = {case: "let", id: Id, dom: SynTrm, arg: SynTrm, bod: SynTrm};
type SynTrmHol = {case: "hol", id: HoleId};

// Syntactic type

type SynTyp    = SynTypNrm | SynTrmLet;
type SynTypNrm = SynTrmUni | SynTrmPie | SynTrmNeu | SynTrmHol;

// Level (Universe)

type Lvl = number;

function joinLvl(l1: Lvl, l2: Lvl): Lvl {return Math.max(l1, l2)}

// Aliases

type Ix = number; // DeBruijn level
type Id = string;
type HoleId = {};

// Show

function showSynTrm(t: SynTrm): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "lam": return `(λ ${showId(t.id)} . ${showSynTrm(t.bod)})`;
    case "pie": return `(Π ${showId(t.id)} : ${showSynTrm(t.dom)} . ${showSynTrm(t.bod)})`;
    case "let": return `(let ${showId(t.id)} : ${showSynTrm(t.dom)} = ${showSynTrm(t.arg)} in ${showSynTrm(t.bod)})`;
    case "hol": return "?";
    case "app":
    case "var": return showSynTrmNeu(t);
  }
}
function showSynTrmNeu(t: SynTrmNeu): string {
  switch (t.case) {
    case "app": return `${showSynTrmNeu(t.app)} ${showSynTrm(t.arg)}`;
    case "var": return showIx(t.ix);
  }
}

function showId(id: Id): string {return id;}

function showIx(ix: Ix): string {return `#${ix.toString()}`;}

/*
## Semantic domain
*/

// Semantic term

type SemTrm = SemTyp | SemTrmArr | SynTrm;
type SemTrmArr = (t: SemTrm) => SemTrm

// Semantic type

type SemTyp    = SynTrmUni | SemTypPie | SynTrmHol | SynTrmNeu;
type SemTypPie = {case: "pie", id: Id, dom: SemTrm, bod: (s: SemTrm) => SemTrm};

/*
## Evaluation
*/

function evlu(t: SynTrm): SemTrm
  {return evluImpl(t, PList.nil())}

function evluImpl(t: SynTrm, G: PList.PList<SemTrm>): SemTrm {
  switch (t.case) {
    case "uni": return t;
    case "lam": return (s: SemTrm) => evluImpl(t.bod, PList.cons(s, G));
    case "pie": return {
      case: "pie",
      id: t.id,
      dom: evluImpl(t.dom, G),
      bod: (s: SemTrm) => evluImpl(t.bod, PList.cons(s, G))
    }
    case "let": return evluImpl(t.bod, PList.cons(evluImpl(t.arg, G), G));
    case "hol": return t;
    case "var": return PList.atRev(t.ix, G);
    case "app": return (evluImpl(t.app, G) as (s: SemTrm) => SemTrm)(evluImpl(t.arg, G));
  }
}

/*
## Reflection
*/

// d: depth
function reflect(T: SemTyp, t: SynTrmNeu, d: number = 0): SemTrm {
  switch (T.case) {
    case "uni": return t;
    case "pie": return (s: SemTrm) =>
                reflect(T.bod(s) as SemTyp, 
                    {case: "app", app: t, arg: reify(T.dom as SemTyp, s, d)}, d + 1);
    case "hol": return t;
    case "app":
    case "var": return t;
  }
}

/*
## Reification
*/

// d: depth 
function reify(T: SemTyp, t: SemTrm, d: number = 0): SynTrm {
  switch (T.case) {
    case "uni": {
      let tT: SemTyp = t as SemTyp;
      switch (tT.case) {
        case "uni": return tT;
        case "pie": {
          let A: SemTrm = tT.dom;
          let B: (s: SemTrm) => SemTrm = tT.bod;
          return {
            case: "pie",
            id: tT.id,
            dom: reify({case: "uni", lvl: T.lvl}, A, d),
            bod: reify({case: "uni", lvl: T.lvl}, B(reflect(A as SemTyp, {case: "var", ix: d}, d + 1)), d)
          };
        }
        case "hol": return tT;
        case "app":
        case "var": return tT;
      }
      break;
    }
    case "pie": {
      let A: SemTrm = T.dom;
      let B: (s: SemTrm) => SemTrm = T.bod;
      return {
        case: "lam",
        id: T.id,
        bod: reify(B(reflect(A as SemTyp, {case: "var", ix: d}, d)) as SemTyp,
                 (t as (s: SemTrm) => SemTrm)(reflect(A as SemTyp, {case: "var", ix: d}, d)),
                 d)
      }
    }
    case "hol": return t as SynTrm; // TODO: why must be a term?
    case "app":
    case "var": return t as SynTrm;
  }
}

/*
## Normalization
*/

function norm(T: SynTyp, t: SynTrm): SynTrm
  {return reify(evlu(T) as SemTyp, evlu(t))}

/*
## Examples
*/

{
  /*
  expl: * -> *
  expl: λ x . let y : * = x in y
  soln: λ x . x
  */
  let T: SynTrm = {case: "pie", id: "A", dom: {case: "uni", lvl: 0}, bod: {case: "uni", lvl: 0}};
  let t: SynTrm = {
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
  console.log(`${showSynTrm(t)} ~> ${showSynTrm(norm(T, t))} : ${showSynTrm(T)}`);
}

{
  /*
  expl: * -> *
  expl: λ x . let y : * = x in ?
  soln: λ x . ?
  */
  let T: SynTrm = {case: "pie", id: "A", dom: {case: "uni", lvl: 0}, bod: {case: "uni", lvl: 0}};
  let t: SynTrm = {
    case: "lam",
    id: "A", // 0
    bod: {
      case: "let",
      id: "B", // 1
      dom: {case: "uni", lvl: 0},
      arg: {case: "var", ix: 0},
      bod: {case: "hol", id: {}}
    }
  };
  // console.log(evlu(T));
  // console.log(evlu(t));
  console.log(`${showSynTrm(t)} ~> ${showSynTrm(norm(T, t))} : ${showSynTrm(T)}`);
}

/*
## Molding

Compute the type and context of each hole.
*/

/*

f : Π x : A . B
a : A
------------------
f a : B a


F : Π x : A . U
a : A
F a : U

*/

function mold(T: SynTypNrm, t: SynTrmNrm): Map<HoleId, SynTypNrm> {
  let holes: Map<HoleId, SynTypNrm> = new Map();
  function go(T: SynTypNrm, t: SynTrmNrm, G: PList.PList<SynTypNrm>): void {
    switch (T.case) {
      case "uni": {
        switch (t.case) {
          case "uni": return;
          case "pie": go(t.dom as SynTypNrm, t.bod as SynTrmNrm, PList.cons(t.dom as SynTypNrm, G)); return;
          case "hol": holes.set(t.id, T); return;
          case "app": // TODO: somehow I need to know the type of t.app in order to figure out what the type of t.arg must be
          case "var": return;
          default: throw new Error(`Impossible: the term ${showSynTrm(t)} : ${showSynTrm(T)} was incorrectly normalized`);
        }
      }
      case "pie": {
        switch (t.case) {
          case "lam": go(T.dom as SynTypNrm, t.bod as SynTrmNrm, PList.cons(T.dom as SynTypNrm, G)); return;
          default: throw new Error(`Impossible: the term ${showSynTrm(t)} : ${showSynTrm(T)} was incorrectly normalized`);
        }
      }
      case "hol": return; // TODO: cannot fill in term with hole type
      case "app": // TODO: can this case happen?
      case "var": // TODO: can this case happen?
    }
  }
  go(T, t, PList.nil());
  return holes;
}

function getLvl(T: SynTypNrm): Lvl {
  function go(T: SynTypNrm, G: PList.PList<Lvl>): Lvl {
    switch (T.case) {
      case "uni": return T.lvl + 1;
      case "pie": {
        let lDom = go(T.dom as SynTypNrm, G);
        let lBod = go(T.bod as SynTypNrm, PList.cons(lDom, G));
        return joinLvl(lDom, lBod);
      }
      case "app": // TODO
      case "var": // TODO
      default: throw new Error(`Impossible: the type ${showSynTrm(T)} is either a hole or not a valid type.`);
    }
  }
  return go(T, PList.nil());
}

// function mold(T: SemTyp, t: SemTrm): Map<HoleId, SemTyp> {
//   let holes: Map<HoleId, SynTrm> = new Map();
//   function go(T: SemTyp, t: SemTrm, d: number = 0): void {
//     switch (T.case) {
//       case "uni": {
//         let tT: SemTyp = t as SemTyp;
//         switch (tT.case) {
//           case "uni": return;
//           case "pie": return "hol";
//           case "hol": return "hol";
//           case "app": return "hol";
//           case "var": return "hol";
//         }
//       }
//       case "pie": return "hol";
//       case "hol": return;
//       case "app": return "hol";
//       case "var": return;
//     }
//   }
//   go(T, t)
//   return holes;
// }