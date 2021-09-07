/*
# Syntax
*/

import { atRev, PList } from "../data/PList";

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
export type SynVar       = {case: "var", id: Id, dbl: Dbl}; // variable
export type SynLet       = {case: "let", id: Id, dom: Syn, arg: Syn, bod: Syn}; // let
export type SynHol       = {case: "hol", id: HoleId}; // ?

export type Level = number | "omega"; // level
export type Id = {lbl: string}; // identifier
export type Dbl = number; // DeBruijn level
export type HoleId = {uid: number};

export function showSyn(t: Syn): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "pie": return `Π ${t.id} : ${showSyn(t.dom)} . ${showSyn(t.cod)}`;
    case "lam": return `λ ${t.id} . ${showSyn(t.bod)}`;
    case "let": return `let ${t.id} : ${showSyn(t.dom)} = ${showSyn(t.arg)} in ${showSyn(t.bod)}`;
    case "hol": return `?`;
    case "app": return `(${showSynNeu(t)})`;
    case "var": return showSynNeu(t);
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

// DeBruijn Levels

export function getDbl<A>(dbl: Dbl, ctx: PList<A>): A
  {return atRev(dbl, ctx);}


// HoleId

let freshHoleIx = -1;
export function freshHoleId(): HoleId {
  freshHoleIx++;
  return {uid: freshHoleIx};
}
export function freshHole(): Syn {return {case: "hol", id: freshHoleId()}}

// HoleIds

// export function getHoleIds(p: Prgm): HoleId[] {
//   let ids: HoleId[] = [];
//   function goNe(t: SynNeu): void {
//     switch(t.case) {
//       case "var": return;
//       case "app": goNe(t.app); go(t.arg); return;
//     }
//   }
//   function go(t: Syn): void {
//     switch (t.case) {
//       case "uni": return;
//       case "pie": go(t.dom); go(t.cod); return;
//       case "lam": go(t.bod); return;
//       case "let": go(t.dom); go(t.arg); go(t.bod); return;
//       case "hol": ids.push(t.id); return;
//       case "app":
//       case "var": goNe(t); return;
//     }
//   }
//   go(p.T);
//   go(p.t);
//   return ids;
// }

export function hasHoleId(id: HoleId, t: Syn): boolean {
  switch (t.case) {
    case "uni": return false;
    case "pie": return hasHoleId(id, t.dom) || hasHoleId(id, t.cod);
    case "lam": return hasHoleId(id, t.bod);
    case "let": return hasHoleId(id, t.dom) || hasHoleId(id, t.arg) || hasHoleId(id, t.bod);
    case "app": return hasHoleId(id, t.app) || hasHoleId(id, t.arg);
    case "var": return false;
    case "hol": return id === t.id;
  }
}

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
    case "hol": return t1.case === t2.case && t1.id === t2.id;
    case "app": return t1.case === t2.case && eqSyn(t1.app, t2.app) && eqSyn(t1.arg, t2.arg);
    case "var": return t1.case === t2.case && t1.dbl === t2.dbl;
  }
}