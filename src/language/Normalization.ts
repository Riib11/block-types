/*
# Normalization by evaluation
*/

import { atRev, cons, nil, PList } from "../data/PList";
import { Sem, SemArr, SemTyp } from "./Semantics";
import { Id, Ix, predLevel, Syn, SynNeu, SynNrm, SynTypNrm, SynVar, U_omega } from "./Syntax";

/*
## Substitution
*/

export type Sub = PList<Sem>;

// export function toSemCtx(sub: Ctx): SemCtx
//   {return map(item => item.T, sub)}

/*
## Normalization
*/

export function normalize(T: Syn, t: Syn, sub: Sub = nil()): SynNrm
  {return reify(evaluate(T) as SemTyp, evaluate(t))}

// T: syntactic type
export function normalizeTyp(T: Syn): SynTypNrm
  {return normalize(U_omega, T) as SynTypNrm}

/*
## Evaluation
*/

export function evaluate(t: Syn, sub: Sub = nil()): Sem {
  switch (t.case) {
    case "uni": return t;
    case "pie":
      return {
        case: "sem pie",
        id: t.id,
        dom: evaluate(t.dom, sub) as SemTyp,
        cod: {case: "sem arr", arr: (a: Sem) => evaluateTyp(t.cod, cons(a, sub))}
      };
    case "lam": return {case: "sem arr", arr: (a: Sem) => evaluate(t.bod, cons(a, sub))};
    case "let": return evaluate(t.bod, cons(evaluate(t.arg, sub), sub));
    case "app": {
      let app = evaluate(t.app, sub);
      let arg = evaluate(t.arg, sub);
      switch (app.case) {
        case "sem arr": return app.arr(arg);
        case "sem pie": return app.cod.arr(arg);
        default: throw new Error("Impossible for well-typed term.");
      }
    }
    case "var": {
      let s = atRev(t.ix, sub);
      if (s !== undefined)
        return s;
      else {
        throw new Error(`The variable index ${t.id.lbl}@${t.ix} is out of bounds.`);
      }
    }
    case "hol": return t;
  }
}

export function evaluateTyp(T: Syn, sub: Sub = nil()): SemTyp
  {return evaluate(T, sub) as SemTyp}

/*
## Reflection
*/

export function reflect(T: SemTyp, t: SynNeu, ix: Ix = 0): Sem {
  switch (T.case) {
    case "uni": return t;
    case "sem pie": 
      return {
        case: "sem arr",
        arr: (a: Sem) => 
          reflect(
            T.cod.arr(a) as SemTyp,
            {case: "app", app: t, arg: reify(T.dom as SemTyp, a, ix)},
            ix + 1
          )
      }
    case "app":
    case "var": return t;
  }
}

/*
## Reification
*/

export function reify(T: SemTyp, t: Sem, ix: Ix = 0): SynNrm {
  switch (T.case) {
    case "uni": {
      let tSemTyp: SemTyp = t as SemTyp;
      switch (tSemTyp.case) {
        case "uni": return tSemTyp;
        case "sem pie":
          return {
            case: "pie",
            id: tSemTyp.id,
            dom: reify({case: "uni", lvl: predLevel(T.lvl)}, tSemTyp.dom, ix) as SynTypNrm,
            cod: reify({case: "uni", lvl: predLevel(T.lvl)}, tSemTyp.cod.arr(reflect(tSemTyp.dom, {case: "var", id: tSemTyp.id, ix}, ix + 1)), ix + 1) as SynTypNrm
          }
        case "app":
        case "var": return tSemTyp as SynTypNrm;
      }
      break;
    }
    case "sem pie": {
      let tSemArr: SemArr = t as SemArr;
      return {
        case: "lam",
        id: T.id,
        bod:
          reify(
            T.cod.arr(reflect(T.dom, {case: "var", id: T.id, ix}, ix + 1)) as SemTyp,
            tSemArr.arr(reflect(T.dom, {case: "var", id: T.id, ix}, ix + 1))
          )
      }
    }
    case "app":
    case "var": return t as SynNrm;
  }
}

export function reifyTyp(T: SemTyp, ix: Ix = 0): SynTypNrm
  {return reify(U_omega, T, ix) as SynTypNrm}

// {
//   let A: Id = {lbl: "A"};
//   let F: Id = {lbl: "F"};
//   let f: Id = {lbl: "f"};
//   let x1: Id = {lbl: "x1"};
//   let x2: Id = {lbl: "x2"};
//   let x3: Id = {lbl: "x3"};
//   let T: Syn = {
//     case: "pie",
//     id: A, // 0
//     dom: U_omega,
//     cod: {
//       case: "pie",
//       id: F, // 1
//       dom: {
//         case: "pie",
//         id: x1, // 1
//         dom: {case: "var", ix: 0, id: A},
//         cod: U_omega
//       },
//       cod: {
//         case: "pie",
//         id: f, // 2
//         dom: {
//           case: "pie",
//           id: x2, // 2
//           dom: {case: "var", ix: 0, id: A},
//           cod: {
//             case: "app",
//             app: {case: "var", ix: 1, id: F},
//             arg: {case: "var", ix: 2, id: x2}
//           }
//         },
//         cod: {
//           case: "pie",
//           id: x3, // 3
//           dom: {case: "var", ix: 0, id: A},
//           cod: {
//             case: "app",
//             app: {case: "var", ix: 1, id: F},
//             arg: {case: "var", ix: 3, id: x3}
//           }
//         }
//       },
//     }
//   };
//   console.log("evaluateTyp(T)"); console.log(evaluateTyp(T));
//   console.log("normalizeTyp(T)"); console.log(normalizeTyp(T));
// }

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
