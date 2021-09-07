/*
# Normalization by evaluation
*/

import { atRev, cons, nil, PList } from "../data/PList";
import { Sem, SemTyp } from "./Semantics";
import { Dbl, Id, predLevel, Syn, SynNeu } from "./Syntax";

/*
## Types
*/

export type Ctx = PList<Sem>;

/*
## Normalization
*/

export function normalize(T: Syn, t: Syn): Syn
  {return reify(evaluate(T) as SemTyp, evaluate(t))}

// T: syntactic type
export function normalizeType(T: Syn): Syn
  {return normalize({case: "uni", lvl: "omega"}, T)}

/*
## Evaluation
*/

export function evaluate(t: Syn, ctx: Ctx = nil()): Sem {
  switch (t.case) {
    case "uni": return t;
    case "pie":
      return {
        case: "pie",
        id: t.id,
        dom: evaluate(t.dom, ctx) as SemTyp,
        cod: (a: Sem) => evaluate(t.cod, cons(a, ctx as Ctx))
      };
    case "lam": return (a: Sem) => evaluate(t.bod, cons(a, ctx as Ctx));
    case "let": return evaluate(t.bod, cons(evaluate(t.arg, ctx), ctx));
    case "hol": return t;
    case "app": return (evaluate(t.app, ctx) as (s: Sem) => Sem)(evaluate(t.arg, ctx));
    case "var": return atRev(t.dbl, ctx);
  }
}

export function evaluateTyp(T: Syn, ctx: Ctx = nil()): SemTyp
  {return evaluate(T, ctx) as SemTyp}

/*
## Reflection
*/

export function reflect(T: SemTyp, t: SynNeu, dbl: Dbl = 0): Sem {
  switch (T.case) {
    case "uni": return t;
    case "pie": return (a: Sem) => 
      reflect(
        T.cod(a) as SemTyp,
        {case: "app", app: t, arg: reify(T.dom as SemTyp, a, dbl)},
        dbl + 1
      );
    case "hol":
    case "app":
    case "var": return t;
  }
}

/*
## Reification
*/

export function reify(T: SemTyp, t: Sem, dbl: Dbl = 0): Syn {
  switch (T.case) {
    case "uni": {
      let tTyp: SemTyp = t as SemTyp;
      switch (tTyp.case) {
        case "uni": return tTyp;
        case "pie":
          return {
            case: "pie",
            id: tTyp.id,
            dom: reify({case: "uni", lvl: predLevel(T.lvl)}, tTyp.dom, dbl),
            cod: reify({case: "uni", lvl: predLevel(T.lvl)}, tTyp.cod(reflect(tTyp.dom, {case: "var", id: tTyp.id, dbl}, dbl + 1)), dbl + 1)
          }
        case "hol": 
        case "app":
        case "var": return tTyp;
      }
      break;
    }
    case "pie":
      return {
        case: "lam",
        id: T.id,
        bod:
          reify(
            T.cod(reflect(T.dom, {case: "var", id: T.id, dbl}, dbl + 1)) as SemTyp,
            (t as (a: Sem) => Sem)(reflect(T.dom, {case: "var", id: T.id, dbl}, dbl + 1))
          )
      }
    case "hol":
    case "app":
    case "var": return t as Syn;
  }
}

export function reifyTyp(T: SemTyp, dbl: Dbl = 0): Syn
  {return reify({case: "uni", lvl: "omega"}, T, dbl)}

// /*
// # Examples
// */

// export type Example = {
//   type: Syn,
//   term: Syn,
//   result: Syn
// }

// // Example 1 (matches ref)

// export const example1: Example = (() => {
//   let id: Id = {lbl: "A"};
//   let type: Syn = {
//     case: "pie",
//     id,
//     dom: {case: "uni", lvl: 5}, 
//     cod: {case: "uni", lvl: 5}
//   };
//   let term: Syn = {
//     case: "lam",
//     id, 
//     cod: {
//       case: "let",
//       id: {lbl: "B"},
//       dom: {case: "uni", lvl: 5},
//       arg: {case: "var", dbl: 0},
//       cod: {case: "var", dbl: 0}
//     }
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();

// // Example 2 (matches ref)

// export const example2: Example = (() => {
//   let type: Syn = {case: "uni", lvl: 5};
//   let term: Syn = {
//     case: "pie",
//     id: {lbl: "P"},
//     dom: {
//       case: "pie",
//       id: {lbl: " "},
//       dom: {case: "uni", lvl: 4},
//       cod: {case: "uni", lvl: 4}
//     },
//     cod: {case: "app", app: {case: "var", dbl: 0}, arg: {case: "uni", lvl: 3}}
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();

// // Example 3 (matches ref)

// export const example3: Example = (() => {
//   let type: Syn = {
//     case: "pie",
//     id: {lbl: "T"},
//     dom: {case: "uni", lvl: 5},
//     cod: {
//       case: "pie",
//       id: {lbl: " "},
//       dom: {case: "var", dbl: 0},
//       cod: {case: "var", dbl: 1}
//     }
//   };
//   let term: Syn = {
//     case: "lam",
//     cod: {
//       case: "lam",
//       cod: {case: "var", dbl: 0}
//     }
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();

// // Example 4

// export const example4: Example = (() => {
//   let type: Syn = {
//     case: "pie",
//     id: {lbl: "A"},
//     dom: {case: "uni", lvl: 0},
//     cod: {case: "uni", lvl: 0}
//   };
//   let term: Syn = {
//     case: "lam",
//     cod: {
//       case: "let",
//       id: {lbl: "A1"},
//       dom: {case: "uni", lvl: 0},
//       arg: {case: "var", dbl: 0},
//       cod: {
//         case: "let",
//         id: {lbl: "A2"},
//         dom: {case: "uni", lvl: 0},
//         arg: {case: "var", dbl: 0},
//         cod: {case: "var", dbl: 0}
//       }
//     }
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();

// // Example 5

// export const example5: Example = (() => {
//   // Π A : U0 . Π B : U0 . U1
//   let type: Syn = {
//     case: "pie",
//     id: {lbl: "A"},
//     dom: {case: "uni", lvl: 0},
//     cod: {
//       case: "pie",
//       id: {lbl: "B"},
//       dom: {case: "uni", lvl: 0},
//       cod: {case: "uni", lvl: 1}
//     }
//   };
//   // λ A . λ B . let A' : U0 = A in
//   //             let B' : U0 = B in
//   //             Π x : A' . B'
//   let term: Syn = {
//     case: "lam",
//     cod: {
//       case: "lam",
//       cod: {
//         case: "let", // let A' : U0 = A
//         id: {lbl: "A'"},
//         dom: {case: "uni", lvl: 0},
//         arg: {case: "var", dbl: 1},
//         cod: {
//           case: "let", // let B' : U0 = B
//           id: {lbl: "B'"},
//           dom: {case: "uni", lvl: 0},
//           arg: {case: "var", dbl: 1},
//           cod: {
//             case: "pie", // Π x : A' . B'
//             id: {lbl: "x"},
//             dom: {case: "var", dbl: 1},
//             cod: {case: "var", dbl: 1}
//           }
//         }
//       }
//     }
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();

// // Example 6

// export const example6: Example = (() => {
//   let type: Syn = {
//     case: "pie",
//     id: {lbl: "A"},
//     dom: {case: "uni", lvl: 0},
//     cod: {case: "uni", lvl: 0}
//   };
//   let term: Syn = {
//     case: "lam",
//     cod: {
//       case: "let",
//       id: {lbl: "A1"},
//       dom: {case: "let", id: {lbl: "B"}, dom: {case: "uni", lvl: 1}, arg: {case: "uni", lvl: 0}, cod: {case: "var", dbl: 0}},
//       arg: {case: "var", dbl: 0},
//       cod: {
//         case: "let",
//         id: {lbl: "A2"},
//         dom: {case: "uni", lvl: 0},
//         arg: {case: "var", dbl: 0},
//         cod: {case: "var", dbl: 0}
//       }
//     }
//   };
//   let result: Syn = norm(type, term);
//   return {type, term, result};
// })();