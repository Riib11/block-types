export type Term
  = {case: "uni", level: Level}                         // universe type
  | {case: "pi",  argTypes: Term[], body: Term}         // Pi-type
  | {case: "lam", body: Term}                           // lambda-term
  | {case: "app", app: Var, args: Term[]}               // application
  | {case: "let", arg: Term, argType: Term, body: Term} // let-term
;
export type Var = number;                               // natural number
export type Level = number;                             // natural number
