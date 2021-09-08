import { app, atRev, cons, len, map, nil, PList, rev, single, toArray } from "../data/PList";
import { Prefab } from "../State";
import { ctxToSemCtx } from "./Ctx";
import { HoleShape } from "./Molding";
import { evaluateTyp, reify, reifyTyp } from "./Normalization";
import { SemTyp } from "./Semantics";
import { Dbl, eqSyn, freshId, hole, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export type PaletteItem
  = {case: "fill", t: Syn}
  | {case: "pfb", pfb: Prefab}

export function genPalette(shape: HoleShape): PaletteItem[] {
  let T = shape.T;
  let plt: PaletteItem[] = [];

  // T = Π (x1 : A1) ... (xn : An) . B(x1, ..., xn)
  // f : T
  // => f ? ... ?
  function genArgHoles(x: SynVar, T: SemTyp): SynNeu {
    switch (T.case) {
      case "pie":
          return {
            case: "app",
            app: genArgHoles(x, T.cod({case: "var", id: T.id, dbl: x.dbl}) as SemTyp),
            arg: hole
          };
      default: return x;
    }
  }

  function paletteFromCtx(): void {
    // console.log("paletteFromCtx.shape:"); console.log(shape);
    let dbl: Dbl = 0;
    map(
      item => {
        // console.log("item:"); console.log(item);
        // console.log("evaluateTyp(item.T):"); console.log(evaluateTyp(item.T, ctxToSemCtx(shape.ctx)));
        let semCtx = ctxToSemCtx(shape.ctx);
        switch (item.T.case) {
          case "pie": {
            plt.push({
              case: "pfb",
              pfb: {
                ctx: shape.ctx,
                T: shape.T,
                t: genArgHoles({case: "var", id: item.id, dbl}, evaluateTyp(item.T, semCtx))
              }
            });
            break;
          }
          case "hol": break;
          default: {
            if (eqSyn(item.T, shape.T))
              plt.push({
                case: "fill",
                t: {case: "var", id: item.id, dbl}
              });
            break;
          }
        }
        dbl++;
      },
      rev(shape.ctx)
    );
  }

  switch (T.case) {
    case "uni": {
      // TODO: interface for picking level
      plt.push({case: "fill", t: {case: "uni", lvl: predLevel(T.lvl)}});
      plt.push({case: "fill", t: {case: "pie", id: freshId(), dom: hole, cod: hole}});
      plt.push({case: "fill", t: {case: "let", id: freshId(), dom: hole, arg: hole, bod: hole}});
      paletteFromCtx()
      break;
    }
    case "pie": {
      plt.push({case: "fill", t: {case: "lam", id: T.id, bod: hole}});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": paletteFromCtx(); break; // TODO
    case "var": paletteFromCtx(); break; // TODO
  }
  plt.reverse();
  return plt;
}

