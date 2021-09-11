/*
# Semantics
*/

import { Id, Syn, SynNeu, SynUni } from "./Syntax";

/*
## Semantic domain
*/

export type Sem = SemTyp | SemArr | Syn
//------------------------------------------------------------------------------
export type SemTyp = SynUni | SemPie | SynNeu
export type SemArr = {case: "sem arr", arr: (t: Sem) => Sem}
export type SemArrTyp = {case: "sem arr", arr: (t: Sem) => SemTyp}
export type SemPie = {case: "sem pie", id: Id, dom: SemTyp, cod: SemArrTyp}