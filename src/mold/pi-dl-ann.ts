export const _ = {};

// /*
// For the dependently-typed λ-calculus with DeBruijn levels with implicit type annotations.
// */

// // TODO: incorporate implicit type annotations

// import * as PList from "../data/PList";

// /*
// ## Syntactic domain

// type-annotated: Π, _•_, x, ?
// actually, just give everything annotations and figure this out later.
// */

// type Syn = SynUni | SynPie | SynLam | SynNe | SynLet | SynHol;
// type SynNe = SynApp | SynVar // neutral
// type SynUni = {case: "uni", lvl: Level}; // universe
// type SynPie = {case: "pie", id: Id, dom: Syn, bod: Syn, type: SynUni}; // Π
// type SynLam = {case: "lam", id: Id, bod: Syn, type: SemPi}; // λ
// type SynApp = {case: "app", app: SynNe, arg: Syn, type: SemTyp}; // application
// type SynVar = {case: "var", dbl: Dbl, type: SemTyp}; // variable
// type SynLet = {case: "let", id: string, dom: Syn, arg: Syn, bod: Syn, type: SemTyp}; // let
// type SynHol = {case: "hol", id: HoleId, type: SemTyp}; // ?

// type Level = number; // level
// type Id = string; // identifier
// type Dbl = number; // DeBruijn level
// type HoleId = {};

// function typeOf(t: Syn): SemTyp {
//   switch (t.case) {
//     case "uni": return {case: "uni", lvl: t.lvl + 1}
//     default: return t.type
//   }
// }

// function showSyn(t: Syn): string {
//   switch (t.case) {
//     case "uni": return `U${t.lvl}`;
//     case "pie": return `Π ${t.id} : ${showSyn(t.dom)} . ${showSyn(t.bod)}`;
//     case "lam": return `λ ${t.id} . ${showSyn(t.bod)}`;
//     case "let": return `let ${t.id} : ${showSyn(t.dom)} = ${showSyn(t.arg)} in ${showSyn(t.bod)}`;
//     case "hol": return `?`;
//     case "app": return ``
//   }
// }

// function showSynNe(t: SynNe): string {
//   switch (t.case) {
//     case "app": return `${showSynNe(t.app)} ${showSyn(t.arg)}`;
//     case "var": return `#${t.dbl}`;
//   }
// }

// /*
// ## Semantic domain
// */

// // Semantic
// type Sem = SemTyp | SemArr | Syn;
// type SemTyp = SynUni | SemPi | SynNe | SynHol;
// type SemArr = {case: "arr", arr: (t: Sem) => Sem};
// type SemPi = {case: "spi", id: Id, dom: SemTyp, bod: SemArr}

// function showSem(t: Sem): string {
//   switch (t.case) {
//     // SemTyp
//     case "spi": return `Π ${t.id} : ${showSem(t.dom)}. ${showSem(t.bod)}`;
//     // SemArr
//     case "arr": return `[SemArr]`;
//     // Syn
//     case "uni": return showSyn(t);
//     case "pie": return showSyn(t);
//     case "lam": return showSyn(t);
//     case "hol": return showSyn(t);
//     case "app": return showSyn(t);
//     case "": return;
//   }
// }

// /*
// ## Normalization by evaluation
// */

// type Ctx = PList.PList<Sem>;

// function evaluate(t: Syn, ctx: Ctx = PList.nil()): Sem {
//   switch (t.case) {
//     case "uni": return t;
//     case "pie": return {
//       case: "pie",
//       id: t.id,
//       dom: evaluate(t.dom, ctx) as SemTyp,
//       bod: (a: Sem) => evaluate(t.bod, PList.cons(a, ctx as Ctx))
//     };
//     case "lam": return (a: Sem) => evaluate(t.bod, PList.cons(a, ctx as Ctx));
//     case "let": return evaluate(t.bod, PList.cons(evaluate(t.arg, ctx), ctx));
//     case "hol": return t;
//     case "app": return (evaluate(t.app, ctx) as (s: Sem) => Sem)(evaluate(t.arg, ctx));
//     case "var": return PList.atRev(t.dbl, ctx);
//   }
// }

// function reflect(t: SynNe, dbl: Dbl = 0): Sem {
//   let T: SemTyp = t.type;
//   switch (T.case) {
//     case "uni": return t;
//     case "pie": {
//       return (a: Sem) => 
//         reflect(
//           {
//             case: "app",
//             app: t,
//             arg: reify((T as SemPi).dom as SemTyp, a, dbl),
//             type: (T as SemPi).bod(a) as SemTyp
//           },
//           dbl + 1
//         );
//       }
//     case "hol":
//     case "app":
//     case "var": return t;
//   }
// }

// function reify(T: SemTyp, t: Sem, dbl: Dbl = 0): Syn {
//   switch (T.case) {
//     case "uni": {
//       let tTyp: SemTyp = t as SemTyp;
//       switch (tTyp.case) {
//         case "uni": return tTyp;
//         case "pie": return {
//           case: "pie",
//           id: tTyp.id,
//           dom: reify({case: "uni", lvl: T.lvl}, tTyp.dom, dbl),
//           bod: reify({case: "uni", lvl: T.lvl}, tTyp.bod(reflect({case: "var", dbl, type: tTyp.dom}, dbl + 1)), dbl + 1),
//           type: {case: "uni", lvl: T.lvl + 1}
//         }
//         case "hol": 
//         case "app":
//         case "var": return tTyp;
//       }
//       break;
//     }
//     case "pie": return {
//       case: "lam",
//       id: T.id,
//       bod:
//         reify(
//           T.bod(reflect({case: "var", dbl, type: T.dom}, dbl + 1)) as SemTyp,
//           (t as (a: Sem) => Sem)(reflect({case: "var", dbl, type: T.dom}, dbl + 1))
//         ),
//       type: T
//     }
//     case "hol":
//     case "app":
//     case "var": return t as Syn;
//   }
// }

// function normalize(t: Syn): Syn
//   {return reify(typeOf(t), evaluate(t))}

// /*
// ## Molding

// Analogy: making a mold. The molding material is poured into the term, which
// seeps into the "shapes" (i.e. type & context) of the holes.

// TODO: should the HoleShape store the type as a SemTyp or a Syn??
// */

// type HoleCtx = PList.PList<SemTyp>;
// type HoleShape = [SemTyp, HoleCtx];

// // t: normalized
// // TODO: Use t or evaluate(t)? I think t is better since they I get typeOf(t).
// function mold(t: Syn): Map<HoleId, HoleShape> {
//   let shapes: Map<HoleId, HoleShape> = new Map();

//   function go(t: Syn, ctx: HoleCtx | undefined = undefined): void {
//     if (ctx === undefined) ctx = undefined;
//     switch (t.case) {
//       case "uni": return;
//       case "pie": go(t.dom, ctx); go(t.bod); return;
//       case "lam": go(t.bod, PList.cons(t.type.dom, ctx as HoleCtx)); return;
//       case "hol": shapes.set(t.id, [typeOf(t), ctx as HoleCtx]); return;
//       case "app": go(t.arg, ctx); go(t.app, ctx); return;
//       case "var": return;
//       case "let": throw new Error("impossible after correct normalization");
//     }
//   }

//   go(normalize(t));
//   return shapes;
// }

// // Examples

// {
//   let t: Syn = {
//     case: "lam",
//     id: "X",
//     bod: {case: "hol", id: {}, type: {case: "uni", lvl: 1}},
//     type: {case: "pie", id: "X", dom: {case: "uni", lvl: 0}, bod: (t: Sem) => ({case: "uni", lvl: 1})}
//   }
//   let shapes = mold(t);
//   shapes.forEach((shape, id) => )
// }