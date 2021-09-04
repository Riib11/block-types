import { app, atRev, cons, len, map, nil, PList, single, toArray } from "../data/PList";
import { HoleCtx, HoleShape } from "./Molding";
import { reify, reifyType } from "./Normalization";
import { SemTyp } from "./Semantics";
import { Dbl, freshHole, freshId, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export function palette(shape: HoleShape): Syn[] {
  let T = shape.T;
  let plt: Syn[] = [];

  function fromCtx(): void {
    let dbl = 0;
    map(
      (item => {
        let cmp = 
          paletteVar(
            shape.ctx,
            reifyType(T,      len(shape.ctx)),
            reifyType(item.T, len(shape.ctx)),
            {case: "var", id: item.id, dbl},
          );
        if (cmp !== undefined) plt.push(cmp);
        dbl++;
      }),
      shape.ctx
    );
  }

  switch (T.case) {
    case "uni": {
      // TODO: interface for picking level
      plt.push({case: "uni", lvl: predLevel(T.lvl)});
      plt.push({case: "pie", id: freshId(), dom: freshHole(), cod: freshHole()});
      plt.push({case: "let", id: freshId(), dom: freshHole(), arg: freshHole(), bod: freshHole()});
      fromCtx();
      break;
    }
    case "pie": {
      plt.push({case: "lam", id: freshId(), bod: freshHole()});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": break; // TODO
    case "var": break; // TODO
  }
  return plt;
}

// ctx: hole context
// G: goal type
// T: type of v
// v: variable
export function paletteVar(ctx: HoleCtx, G: Syn, T: Syn, v: SynVar): Syn | undefined {
  let dblLoc: Dbl = len(ctx);

  // Unroll

  // Π x : A . Π y : B . C(x ,y)  ==>  {args: [A, B], tgt: C(x, y)]
  function unroll(T: Syn): {args: Map<Dbl, Syn>, tgt: Syn} {
    let args: Map<Dbl, Syn> = new Map();
    function go(T: Syn, dbl: Dbl = dblLoc + 1): Syn { // TODO or not +1?
      switch (T.case) {
        case "pie": args.set(dbl, T.dom); return go(T.cod, dbl + 1);
        default: return T;
      }
    }
    return {args, tgt: go(T)};
  }
  let unr = unroll(T);
  let args = unr.args;
  let tgt = unr.tgt;

  // Constrain

  type Sub = Map<Dbl, Syn>;
  let sub: Sub = new Map();
  
  function constrainDbl(T: Syn, dbl: Dbl): void {
    let S = sub.get(dbl);
    if (S !== undefined) {
      if (!eqSyn(T, S)) throw new Error(`Incompatible substitution`);
    } else {
      sub.set(dbl, T);
    }
  }

  // G: goal type
  // T: target type
  function constrain(G: Syn, T: Syn, dbl: Dbl): void {
    switch (G.case) {
      case "uni": return;
      case "pie": {
        if (G.case === T.case) {
          constrain(G.dom, T.dom, dbl);
          constrain(G.cod, T.cod, dbl);
        }
        else {
          if (T.case === "var" && T.dbl === dbl)
            constrainDbl(T, dbl);
        }
        return;
      }
      case "lam": throw new Error(`Impossible in a normalized type`);
      case "let": throw new Error(`Impossible in a normalized type`);
      case "app": if (!eqSyn(G, T)) throw new Error(`Incompatible types.`); else return;
      case "var": if (!eqSyn(G, T)) throw new Error(`Incompatible types.`); else return;
      case "hol": return;
    }
  }

  function applySub(T: Syn): Syn {
    switch (T.case) {
      case "uni": return T;
      case "pie": return {case: "pie", id: T.id, dom: applySub(T.dom), cod: applySub(T.cod)};
      case "lam": throw new Error(`Impossible in a normalized type`);
      case "let": throw new Error(`Impossible in a normalized type`);
      case "app": return {case: "app", app: applySub(T.app) as SynNeu, arg: applySub(T.arg)};
      case "var": {
        let Tnew = sub.get(T.dbl);
        return Tnew !== undefined ? Tnew : T;
      }
      case "hol": return T;
    }
  }

  function updateSub(): void {
    sub.forEach((T, dbl) => sub.set(dbl, applySub(T)));
  }

  try {
    // Constrain each variable introduced by dblVar's args
    for (let dbl: Dbl = dblLoc + 1; dbl < args.size + dblLoc + 1; dbl++) {
      constrain(G, tgt, dbl);
      // update sub
      sub.forEach((T, dbl) => sub.set(dbl, applySub(T)));
      // update target
      tgt = applySub(tgt);
    }

    let t: SynNeu = v;
    args.forEach((T, dbl) => {
      let arg = sub.get(dbl);
      t = arg !== undefined ?
            {case: "app", app: t, arg} :
            {case: "app", app: t, arg: freshHole()};
    });
    return t;
  } catch (e) {
    return undefined;
  }
}

export function eqSyn(t: Syn, s: Syn): boolean {
  switch (t.case) {
    case "uni": return t.case === s.case && t.lvl === s.lvl;
    case "pie": return t.case === s.case && eqSyn(t.cod, s.cod) && eqSyn(t.dom, s.dom);
    case "lam": return t.case === s.case && eqSyn(t.bod, s.bod);
    case "hol": return t.case === s.case && t.id === s.id;
    case "app": return t.case === s.case && eqSyn(t.app, s.app) && eqSyn(t.arg, s.arg);
    case "var": return t.case === s.case && t.dbl === s.dbl;
    case "let": return t.case === s.case && eqSyn(t.dom, s.dom) && eqSyn(t.arg, s.arg) && eqSyn(t.bod, s.bod);
  }
}

// // -----------------------------------------------------------------------------
// // OLD
// // -----------------------------------------------------------------------------

// // T: goal type (cannot be a Π since required η-expansion)
// // S: variable type
// export function compatibility(T: Syn, S: Syn, v: SynVar, ctx: HoleCtx): Syn | undefined {
//   // Π x : A . Π y : B . C(x ,y)  ==>  [A, B, C(x, y)]
//   function unroll(T: Syn): Syn[] {
//     let unr: Syn[] = [];
//     function go(T: Syn): void {
//       switch (T.case) {
//         case "pie": unr.push(T.dom); unroll(T.cod); return;
//         default: unr.push(T); return;
//       }
//     }
//     go(T);
//     return unr.reverse();
//   }
//   let Sunr: Syn[] = unroll(S);
  
//   if (Sunr.length === 0) {
//     if (eqSyn(T, S))
//       return v;
//     else
//       return undefined;
//   }

//   type Cnst = [Dbl, Syn];
//   let cnstrs: Cnst[] = [];
//   function constrain(T: Syn, S: Syn): boolean {
//     switch (T.case) {
//       case "uni": {
//         if (S.case === "var") {
//           cnstrs.push([S.dbl, T]);
//           return true;
//         } else {
//           return eqSyn(T, S);
//         }
//       }
//       case "pie": {
//         if (S.case === "var") {
//           cnstrs.push([S.dbl, T]);
//           return true;
//         } else {
//           return S.case === T.case && constrain(T.dom, S.dom) && constrain(T.cod, S.cod);
//         }
//       }
//       case "lam": throw new Error(`The terms ${showSyn(T)} and ${showSyn(S)} must be normalized types.`);
//       case "let": throw new Error(`The terms ${showSyn(T)} and ${showSyn(S)} must be normalized types.`);
//       case "hol": return true; // TODO
//       case "app": {
//         if (S.case === "var") {
//           cnstrs.push([S.dbl, T]);
//           return true;
//         } else {
//           return S.case === T.case && constrain(S.app, T.app) && constrain(S.arg, T.arg);
//         }
//       }
//       case "var": {
//         if (S.case === "var") {
//           if (S.dbl === T.dbl) {
//             return true;
//           } else {
//             cnstrs.push([S.dbl, T]);
//             return true;
//           }
//         } else {
//           return false;
//         }
//       }
//     }
//   }

//   cnstrs.sort()

//   // Validate that the cnstrs are satisfiable
//   type CnstrsValid = Map<Dbl, Syn>;
//   let cnstrsValid = new Map();
//   function validateConstraints(i: number = 0): boolean {
//     if (i < cnstrs.length) {
//       let [dbl, T] = cnstrs[i];
//       if (cnstrsValid.has())
//     } else {
//       return true;
//     }

//   }


//   let Sunr_args = Sunr.slice(0, -1);
//   let Sunr_tgt = Sunr[Sunr.length - 1];
//   // TODO: check exists subst σ to make σ(S) = T
//   if (!constrain(T, Sunr_tgt)) return false;




//   // // Check that S has a form compatible with T
//   // function checkForms(T: Syn, S: Syn): boolean {
//   //   switch (T.case) {
//   //     case "pie": return (T.case === S.case && checkForms(T.dom, S.dom) && checkForms(T.cod, S.cod)) || S.case === "var";
//   //     case "app": return (T.case === S.case && checkForms(T.app, S.app) && checkForms(T.arg, S.arg)) || S.case === "var";
//   //     case "var": return T.case === S.case && T.dbl === S.dbl;
//   //     case "lam":
//   //     case "let": throw Error(`The terms ${showSyn(T)} and ${showSyn(S)} must be normalized types.`);
//   //     case "hol": return false; // cannot fill in hole at hole type
//   //     case "uni": return eqSyn(T, S);
//   //   }
//   // }

//   // // function cmp(T: Syn, S: Syn): Syn | undefined {
//   // //   switch (T.case) {
//   // //     default: 
//   // //   }
//   // // }

//   // // let unr = unroll(T);
//   // // let Sunr = unroll(S);

//   // // let t: SynNeu = v;

//   // // try {
//   // //   if (unr.length !== Sunr.length) throw new Error("not compatible");

//   // //   for (let i = 0; i < unr.length; i++) {
//   // //     if (eqSyn(unr[i], Sunr[i])) {
//   // //       t = {case: "app", app: t, arg: _};
//   // //     } else {
//   // //       throw new Error("not compatible");
//   // //     }
//   // //   }
//   // //   return t;
//   // // } catch(e) {
//   // //   return undefined;
//   // // }

//   // // function unwrap(T: Syn, S: Syn)


//   // function go(T: Syn, S: Syn, s: Syn): Syn {
//   //   switch (S.case) {
//   //     case "pie":
//   //       // TODO: this is a hard problem because, to match T, S might have to have specific values instantiated (which fill in arguments). This can be done by making the generated Syn for the fill already have those arguments filled. But, introduces a sort of equation-solving problem where I have to figure out if there is a possible instantiation in S that produces T.
//   //   }
//   // }
// }

