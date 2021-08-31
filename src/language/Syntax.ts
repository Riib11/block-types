// Program

export type Prgm
  = {case: "jud", term: Term, type: Term} // judgement

// Term

export type Term = TermUni | TermPi | TermLam | TermLet | TermNe | TermHol
export type TermNe = TermApp | TermVar
export type Type = TermUni | TermPi | TermLam | TermNe | TermHol // Term w/o let-term

export type TermUni = {case: "uni", lvl: Lvl, dat?: Data}; // universe
export type TermPi  = {case: "pi",  id: Id, dom: Term, bod: Term, dat?: Data}; // Π
export type TermLam = {case: "lam", bod: Term, dat?: Data}; // λ
export type TermLet = {case: "let", id: Id, dom: Term, arg: Term, bod: Term, dat?: Data}; // let
export type TermHol = {case: "hol", id: HoleId, dat?: Data}; // hole
export type TermApp = {case: "app", app: TermNe, arg: Term}; // f a (DeBruijn indexed)
export type TermVar = {case: "var", var: Var}; // x 

export type Id = {lbl: string};
export type Var = number; // natural number
export type Lvl = number; // natural number

export function showTerm(t: Term): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "pi": return `(Π ${t.id} : ${showTerm(t.dom)} . ${showTerm(t.bod)})`;
    case "lam": return `(λ ${showTerm(t.bod)})`;
    case "let": return `let ${t.id} : ${showTerm(t.dom)} = ${showTerm(t.arg)} in ${showTerm(t.bod)}`;
    case "app": return `${showTerm(t.app)} ${showTerm(t.arg)}`;
    case "var": return t.var.toString();
    case "hol": return "?";
  }
}

// Data

export type Data = {}; // TODO

export function emptyData() { return {}; }

// HoleId

// Each hole id is just a unique reference to a trivial object.
export type HoleId = {ix: number};

let freshHoleIx = -1;
export function freshHoleId(): HoleId {
  freshHoleIx++;
  return {ix: freshHoleIx};
}
export function freshHole(): Term { return {case: "hol", id: freshHoleId(), dat: emptyData()} }

// HoleIds

export function getHoleIds(p: Prgm): HoleId[] {
  let ids: HoleId[] = [];
  function goNe(t: TermNe): void {
    switch(t.case) {
      case "var": return;
      case "app": goNe(t.app); go(t.arg); return;
    }
  }
  function go(t: Term): void {
    switch (t.case) {
      case "uni": return;
      case "pi": go(t.dom); go(t.bod); return;
      case "lam": go(t.bod); return;
      case "let": go(t.dom); go(t.arg); go(t.bod); return;
      case "hol": ids.push(t.id); return;
      case "app":
      case "var": goNe(t); return;
    }
  }
  switch (p.case) {
    case "jud": go(p.term); go(p.type); break;
  }
  return ids;
}

// Ids

export function renameId(p: Prgm, id: Id, lbl: string): void {
  // function go(a: Term): void {
  //   switch (t.case) {
  //     case "uni": return;
  //     case "pi": {
  //       if (t.id === id) 
  //     }
  //   }
  // }
}