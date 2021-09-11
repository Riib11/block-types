import { app, atRev, cons, len, map, nil, PList, rev, single, toArray } from "../data/PList";
import { Buffer } from "../State";
import { ctxToSub } from "./Ctx";
import { HoleShape } from "./Molding";
import { evaluateTyp, reify, reifyTyp } from "./Normalization";
import { SemTyp } from "./Semantics";
import { eqSyn, freshId, hole, Ix, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export type PaletteItem
  = {case: "fill", t: Syn}
  | {case: "buf", buf: Buffer}

export function genPalette(shape: HoleShape): PaletteItem[] {
  let T = shape.T;
  let plt: PaletteItem[] = [];

  // T = Π (x1 : A1) ... (xn : An) . B(x1, ..., xn)
  // f : T
  // => f ? ... ?
  function genArgHoles(x: SynVar, T: SemTyp): SynNeu {
    switch (T.case) {
      case "sem pie":
          return {
            case: "app",
            app: genArgHoles(x, T.cod.arr({case: "var", id: T.id, ix: x.ix}) as SemTyp),
            arg: hole()
          };
      default: return x;
    }
  }

  function paletteFromCtx(): void {
    let ix: Ix = 0;
    map(
      item => {
        let semCtx = ctxToSub(shape.ctx);
        switch (item.T.case) {
          case "pie": {
            plt.push({
              case: "buf",
              buf: {
                path: shape.path,
                t: genArgHoles({case: "var", id: item.id, ix}, evaluateTyp(item.T, semCtx))
              }
            });
            break;
          }
          case "hol": break;
          default: {
            if (eqSyn(item.T, shape.T))
              plt.push({
                case: "fill",
                t: {case: "var", id: item.id, ix}
              });
            break;
          }
        }
        ix++;
      },
      rev(shape.ctx)
    );
  }

  switch (T.case) {
    case "uni": {
      // TODO: interface for picking level
      plt.push({case: "fill", t: {case: "uni", lvl: predLevel(T.lvl)}});
      plt.push({case: "fill", t: {case: "pie", id: freshId(), dom: hole(), cod: hole()}});
      plt.push({case: "fill", t: {case: "let", id: freshId(), dom: hole(), arg: hole(), bod: hole()}});
      paletteFromCtx()
      break;
    }
    case "pie": {
      plt.push({case: "fill", t: {case: "lam", id: T.id, bod: hole()}});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": paletteFromCtx(); break; // TODO
    case "var": paletteFromCtx(); break; // TODO
  }
  plt.reverse();
  return plt;
}

