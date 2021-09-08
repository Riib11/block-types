/*
# Normalization by evaluation for the dependently-typed λ-calculus with DeBruijn levels.
*/

import * as PList from "../data/PList";

/*
## Syntactic domain
*/

// Syntactic term

type SynTrm       = SynTrmUni | SynTrmPie    | SynTrmLam    | SynTrmNeu    | SynTrmHol | SynTrmLet;
type SynTrmNrm    = SynTrmUni | SynTrmPieNrm | SynTrmLamNrm | SynTrmNeuNrm | SynTrmHol;
type SynTrmNeu    = SynTrmApp    | SynTrmVar;
type SynTrmNeuNrm = SynTrmAppNrm | SynTrmVar

type SynTrmUni    = {case: "uni", lvl: Lvl};
type SynTrmPie    = {case: "pie", id: Id, dom: SynTrm, bod: SynTrm};
type SynTrmPieNrm = {case: "pie", id: Id, dom: SynTrmNrm, bod: SynTrmNrm};
type SynTrmLam    = {case: "lam", id: Id, bod: SynTrm};
type SynTrmLamNrm = {case: "lam", id: Id, bod: SynTrmNrm};
type SynTrmApp    = {case: "app", app: SynTrmNeu, arg: SynTrm}
type SynTrmAppNrm = {case: "app", app: SynTrmNeuNrm, arg: SynTrmNrm}
type SynTrmVar    = {case: "var", ix: Ix};
type SynTrmLet    = {case: "let", id: Id, dom: SynTrm, arg: SynTrm, bod: SynTrm};
type SynTrmHol    = {case: "hol", id: HoleId};

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
    case "var": return PList.atRev(t.ix, G) as SemTrm;
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
function reify(T: SemTyp, t: SemTrm, d: number = 0): SynTrmNrm {
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
            dom: reify({case: "uni", lvl: T.lvl}, A, d) as SynTrmNrm,
            bod: reify({case: "uni", lvl: T.lvl}, B(reflect(A as SemTyp, {case: "var", ix: d}, d + 1)), d)
          };
        }
        case "hol": return tT;
        case "app":
        case "var": return tT as SynTrmNrm;
      }
      break;
    }
    case "pie": {
      let A: SemTrm = T.dom;
      let B: (s: SemTrm) => SemTrm = T.bod;
      let BTyp: SemTyp = B(reflect(A as SemTyp, {case: "var", ix: d}, d)) as SemTyp;
      let bod: SemTrm = (t as (s: SemTrm) => SemTrm)(reflect(A as SemTyp, {case: "var", ix: d}, d));
      return {
        case: "lam",
        id: T.id,
        bod: reify(BTyp, bod, d)
      }
    }
    case "hol": return t as SynTrmNrm;
    case "app":
    case "var": return t as SynTrmNrm;
  }
}

/*
## Normalization
*/

function norm(T: SynTrm, t: SynTrm): SynTrmNrm
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
  // console.log(`${showSynTrm(t)} ~> ${showSynTrm(norm(T, t))} : ${showSynTrm(T)}`);
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
  // console.log(`${showSynTrm(t)} ~> ${showSynTrm(norm(T, t))} : ${showSynTrm(T)}`);
}

/*
## Molding

Compute the "shape" (i.e. type and context) of each hole.
*/

type HoleShape = [SynTrmNrm, PList.PList<SynTrmNrm>];
function showHoleShape(shape: HoleShape): string {
  return `type ${showSynTrm(shape[0])} in ${PList.showPList(shape[1], t => showSynTrm(t))}`;
}

export function mold(T: SynTrmNrm, t: SynTrmNrm): Map<HoleId, HoleShape> {
  let shapes: Map<HoleId, HoleShape> = new Map();
  function goNrm(T: SynTrmNrm, t: SynTrmNrm, G: PList.PList<SynTrmNrm>): void {
    switch (T.case) {
      case "uni": {
        switch (t.case) {
          case "uni": return;
          case "pie": goNrm(t.dom, t.bod, PList.cons(t.dom, G)); return;
          case "hol": shapes.set(t.id, [T, G]); return;
          case "app": goUniApp(t, G); return;
          case "var": return;
          default: throw new Error(`Impossible: the term ${showSynTrm(t)} : ${showSynTrm(T)} was incorrectly normalized`);
        }
      }
      case "pie": {
        switch (t.case) {
          case "lam": goNrm(T.dom, t.bod, PList.cons(T.dom, G)); return;
          default: throw new Error(`Impossible: the term ${showSynTrm(t)} : ${showSynTrm(T)} was incorrectly normalized`);
        }
      }
      case "hol": return; // NOTE: cannot fill in term with hole type
      case "app": return;
      case "var": mold(PList.atRev(T.ix, G) as SynTrmNrm, t); return;
    }
  }
  function goUniApp(t: SynTrmNeuNrm, G: PList.PList<SynTrmNrm>): SynTrmPieNrm {
    switch (t.case) {
      case "app": {
        let F: SynTrmPieNrm = goUniApp(t.app, G);
        goNrm(F.dom, t.arg, G);
        return F.bod as SynTrmPieNrm;
      }
      case "var": return PList.atRev(t.ix, G) as SynTrmPieNrm;
    }
  }
  goNrm(T, t, PList.nil());
  return shapes;
}

// function getLvl(T: SynTrmNrm): Lvl {
//   function go(T: SynTrmNrm, G: PList.PList<Lvl>): Lvl {
//     switch (T.case) {
//       case "uni": return T.lvl + 1;
//       case "pie": {
//         let lDom = go(T.dom as SynTrmNrm, G);
//         let lBod = go(T.bod as SynTrmNrm, PList.cons(lDom, G));
//         return joinLvl(lDom, lBod);
//       }
//       case "app": // TODO
//       case "var": // TODO
//       default: throw new Error(`Impossible: the type ${showSynTrm(T)} is either a hole or not a valid type.`);
//     }
//   }
//   return go(T, PList.nil());
// }

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
      arg: {case: "hol", id: {}},
      bod: {case: "hol", id: {}}
    }
  };
  // let shapes: Map<HoleId, HoleShape> = mold(norm({case: "uni", lvl: 1}, T), norm(T, t));
  // shapes.forEach((shape,  id) => console.log(showHoleShape(shape)));
  console.log(`${showSynTrm(t)} ~> ${showSynTrm(norm(T, t))} : ${showSynTrm(T)}`);
}
