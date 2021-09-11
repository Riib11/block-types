/*
# Syntax
*/

import { atRev, PList } from "../data/PList";
import { HoleId } from "./HoleId";

/*
## Syntactic domain
*/

export type Syn          = SynUni | SynPie    | SynNeu    | SynHol | SynLam    | SynLet; // syntactical
export type SynNrm       = SynUni | SynPieNrm | SynNeuNrm | SynHol | SynLamNrm ; // syntactical normal form
export type SynTypNrm    = SynUni | SynPieNrm | SynNeuNrm | SynHol ; // syntactical type normal form
//------------------------------------------------------------------------------
export type SynNeu       = SynApp    | SynVar // neutral
export type SynNeuNrm    = SynAppNrm | SynVar // neutral
//------------------------------------------------------------------------------
export type SynUni       = {case: "uni", lvl: Level}; // universe
export type SynPie       = {case: "pie", id: Id, dom: Syn, cod: Syn}; // Π
export type SynPieNrm    = {case: "pie", id: Id, dom: SynTypNrm, cod: SynTypNrm}; // Π
export type SynLam       = {case: "lam", id: Id, bod: Syn}; // λ
export type SynLamNrm    = {case: "lam", id: Id, bod: SynNrm}; // λ
export type SynApp       = {case: "app", app: SynNeu, arg: Syn}; // application
export type SynAppNrm    = {case: "app", app: SynNeuNrm, arg: SynNrm}; // application
export type SynLet       = {case: "let", id: Id, dom: Syn, arg: Syn, bod: Syn}; // let
export type SynVar       = {case: "var", id: Id, ix: Ix}; // variable
export type SynHol       = {case: "hol", ix: Ix} // hole

export type Level = number | "omega"; // level
export type Id = {lbl: string}; // identifier
export type Ix = number; // DeBruijn level or hole index

export const U_omega: SynUni = {case: "uni", lvl: "omega"};

var holeCounter = -1;
export function hole(): SynHol {
  holeCounter++;
  return {case: "hol", ix: holeCounter};
}

export function showSyn(t: Syn): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "pie": return `Π ${t.id.lbl} : ${showSyn(t.dom)} . ${showSyn(t.cod)}`;
    case "lam": return `λ ${t.id.lbl} . ${showSyn(t.bod)}`;
    case "let": return `let ${t.id.lbl} : ${showSyn(t.dom)} = ${showSyn(t.arg)} in ${showSyn(t.bod)}`;
    case "app": return `(${showSynNeu(t)})`;
    case "var": return showSynNeu(t);
    case "hol": return "?";
  }
}

export function showSynNeu(t: SynNeu): string {
  switch (t.case) {
    case "app": return `${showSynNeu(t.app)} ${showSyn(t.arg)}`;
    case "var": return `${t.id.lbl}`;
  }
}

// Level

export function showLevel(lvl: Level): string {
  return lvl === "omega" ? "ω" : lvl.toString();
}

export function predLevel(lvl: Level): Level {
  return lvl === "omega" ? lvl : lvl - 1;
}

// HoleId

// let freshHoleIx = -1;
// export function freshHoleId(): HoleId {
//   freshHoleIx++;
//   return {uid: freshHoleIx};
// }
// export function hole: Syn {return {case: "hol", id: freshHoleId()}}

// HoleIds

// export function getHoleIds(t: Syn): HoleId[] {
//   let ids: HoleId[] = [];
//   function go(t: Syn): void {
//     switch (t.case) {
//       case "uni": return;
//       case "pie": go(t.dom); go(t.cod); return;
//       case "lam": go(t.bod); return;
//       case "let": go(t.dom); go(t.arg); go(t.bod); return;
//       case "hol": ids.push(t.id); return;
//       case "app": go(t.app); go(t.arg); return;
//       case "var": return;
//     }
//   }
//   go(t);
//   return ids;
// }

// export function hasHoleId(id: HoleId, t: Syn): boolean {
//   switch (t.case) {
//     case "uni": return false;
//     case "pie": return hasHoleId(id, t.dom) || hasHoleId(id, t.cod);
//     case "lam": return hasHoleId(id, t.bod);
//     case "let": return hasHoleId(id, t.dom) || hasHoleId(id, t.arg) || hasHoleId(id, t.bod);
//     case "app": return hasHoleId(id, t.app) || hasHoleId(id, t.arg);
//     case "var": return false;
//     case "hol": return id === t.id;
//   }
// }

// Ids

export function freshId(lbl: string = "x"): Id
  {return {lbl};}

// export function renameId(p: Prgm, id: Id, lbl: string): void {
//   // function go(a: Syn): void {
//   //   switch (t.case) {
//   //     case "uni": return;
//   //     case "pi": {
//   //       if (t.id === id) 
//   //     }
//   //   }
//   // }
// }

// Equality

export function eqSyn(t1: Syn, t2: Syn): boolean {
  switch (t1.case) {
    case "uni": return t1.case === t2.case && t1.lvl === t2.lvl;
    case "pie": return t1.case === t2.case && eqSyn(t1.dom, t2.dom) && eqSyn(t1.cod, t2.cod);
    case "lam": return t1.case === t2.case && eqSyn(t1.bod, t2.bod);
    case "let": return t1.case === t2.case && eqSyn(t1.dom, t2.dom) && eqSyn(t1.arg, t2.arg) && eqSyn(t1.bod, t2.bod);
    case "app": return t1.case === t2.case && eqSyn(t1.app, t2.app) && eqSyn(t1.arg, t2.arg);
    case "var": return t1.case === t2.case && t1.ix === t2.ix
    case "hol": return t1.case === t2.case && t1.ix === t2.ix;
  }
}

// Utility

// A term is concrete if it contains no holes.
export function isConcrete(t: Syn): boolean {
  switch (t.case) {
    case "uni": return true;
    case "pie": return isConcrete(t.cod) && isConcrete(t.dom);
    case "lam": return isConcrete(t.bod);
    case "let": return isConcrete(t.dom) && isConcrete(t.arg) && isConcrete(t.bod);
    case "app": return isConcrete(t.app) && isConcrete(t.arg);
    case "var": return true;
    case "hol": return false;
  }
}
