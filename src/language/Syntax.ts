/*
# Syntax
*/

import { atRev, cons, nil, PList } from "../data/PList";

/*
## Program
*/

export type Prgm
  = {case: "jud", t: Syn, T: Syn} // judgement

  /*
## Syntactic domain
*/

export type Syn = SynUni | SynPie | SynLam | SynNeu | SynLet | SynHol;
//------------------------------------------------------------------------------
export type SynNeu = SynApp | SynVar // neutral
export type SynUni = {case: "uni", lvl: Level}; // universe
export type SynPie = {case: "pie", id: Id, dom: Syn, cod: Syn}; // Π
export type SynLam = {case: "lam", id: Id, bod: Syn}; // λ
export type SynApp = {case: "app", app: SynNeu, arg: Syn}; // application
export type SynVar = {case: "var", id: Id, dbl: Dbl}; // variable
export type SynLet = {case: "let", id: Id, dom: Syn, arg: Syn, bod: Syn}; // let
export type SynHol = {case: "hol", id: HoleId}; // ?

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

export function showLevel(lvl: Level): string {
  return lvl === "omega" ? "ω" : lvl.toString();
}

export function predLevel(lvl: Level): Level {
  return lvl === "omega" ? lvl : lvl - 1;
}

// HoleId

let freshHoleIx = -1;
export function freshHoleId(): HoleId {
  freshHoleIx++;
  return {uid: freshHoleIx};
}
export function freshHole(): Syn {return {case: "hol", id: freshHoleId()}}

// HoleIds

export function getHoleIds(p: Prgm): HoleId[] {
  let ids: HoleId[] = [];
  function goNe(t: SynNeu): void {
    switch(t.case) {
      case "var": return;
      case "app": goNe(t.app); go(t.arg); return;
    }
  }
  function go(t: Syn): void {
    switch (t.case) {
      case "uni": return;
      case "pie": go(t.dom); go(t.cod); return;
      case "lam": go(t.bod); return;
      case "let": go(t.dom); go(t.arg); go(t.bod); return;
      case "hol": ids.push(t.id); return;
      case "app":
      case "var": goNe(t); return;
    }
  }
  switch (p.case) {
    case "jud": go(p.t); go(p.T); break;
  }
  return ids;
}

// Ids

export function freshId(lbl: string = "x"): Id
  {return {lbl};}

export function renameId(p: Prgm, id: Id, lbl: string): void {
  // function go(a: Syn): void {
  //   switch (t.case) {
  //     case "uni": return;
  //     case "pi": {
  //       if (t.id === id) 
  //     }
  //   }
  // }
}