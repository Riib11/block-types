/*
# Semantics
*/

import { Id, Syn, SynHol, SynNeu, SynUni } from "./Syntax";

/*
## Semantic domain
*/

export type Sem = SemTyp | SemArr | Syn;
//------------------------------------------------------------------------------
export type SemTyp = SynUni | SemPie | SynNeu | SynHol;
export type SemArr = (t: Sem) => Sem;
export type SemTypArr = (t: Sem) => SemTyp;
export type SemPie = {case: "pie", id: Id, dom: SemTyp, cod: SemTypArr}