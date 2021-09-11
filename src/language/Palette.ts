import { app, atRev, cons, len, map, nil, PList, rev, single, toArray } from "../data/PList";
import { Buffer, Tran } from "../State";
import { ctxToSub } from "./Ctx";
import { HoleShape } from "./Molding";
import { evaluateTyp, reify, reifyTyp } from "./Normalization";
import { SemTyp } from "./Semantics";
import { eqSyn, freshId, hole, Ix, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export function genPalette(shape: HoleShape): Tran[] {
  let T = shape.T;
  let items: Tran[] = [];

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
            items.push({
              case: "create buffer",
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
              items.push({
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
      items.push({case: "fill", t: {case: "uni", lvl: predLevel(T.lvl)}});
      items.push({case: "fill", t: {case: "pie", id: freshId(), dom: hole(), cod: hole()}});
      items.push({case: "fill", t: {case: "let", id: freshId(), dom: hole(), arg: hole(), bod: hole()}});
      paletteFromCtx()
      break;
    }
    case "pie": {
      items.push({case: "fill", t: {case: "lam", id: T.id, bod: hole()}});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": paletteFromCtx(); break; // TODO
    case "var": paletteFromCtx(); break; // TODO
  }
  items.reverse();
  return items;
}

