// Program

export type Prgm
  = {case: "jud", term: Term, type: Term} // judgement

// Term

export type Term
  = {case: "uni", lvl: Lvl, dat?: Data} // universe type
  | {case: "pi",  id: Id, dom: Term, bod: Term, dat?: Data} // Π-type
  | {case: "lam", bod: Term, dat?: Data} // λ-term
  // | {case: "app", app: Var, args: Term[], dat?: Data} // neutral
  | {case: "neu", neu: Neu, dat?: Data} // neutral
  | {case: "let", id: Id, dom: Term, arg: Term, bod: Term, dat?: Data} // let-term
  | {case: "hol", id: HoleId, dat?: Data}
;

export type Type = Term // except without let-term case

// Neutral Form

export type Neu
  = {case: "var", var: Var}
  | {case: "app", app: Neu, arg: Term}
;

export type Id = {lbl: string};
export type Var = number; // natural number
export type Lvl = number; // natural number

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
  function goNeu(neu: Neu): void {
    switch(neu.case) {
      case "var": return;
      case "app": goNeu(neu.app); go(neu.arg); return;
    }
  }
  function go(a: Term): void {
    switch (a.case) {
      case "uni": return;
      case "pi": go(a.dom); go(a.bod); return;
      case "lam": go(a.bod); return;
      case "neu": goNeu(a.neu); return;
      case "let": go(a.dom); go(a.arg); go(a.bod); return;
      case "hol": ids.push(a.id); return;
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
  //   switch (a.case) {
  //     case "uni": return;
  //     case "pi": {
  //       if (a.id === id) 
  //     }
  //   }
  // }
}