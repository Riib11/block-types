// Term

export type Term
  = {case: "uni", lvl: Lvl, data: Data}                            // universe type
  | {case: "pi",  domains: Term[], body: Term, data: Data}         // Pi-type
  | {case: "lam", body: Term, data: Data}                          // lambda-term
  | {case: "app", app: Var, args: Term[], data: Data}              // application
  | {case: "let", arg: Term, domain: Term, body: Term, data: Data} // let-term
  | {case: "hole", id: HoleId, data: Data}
;
export type Var = number; // natural number
export type Lvl = number; // natural number

// Data

export type Data = {}; // TODO

export function emptyData() { return {}; }

// HoleId

// Each hole id is just a unique reference to a trivial object.
export type HoleId = {};

export function freshHoleId() { return {}; }
