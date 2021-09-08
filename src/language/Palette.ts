import { app, atRev, cons, len, map, nil, PList, rev, single, toArray } from "../data/PList";
import { ctxToSemCtx } from "./Ctx";
import { HoleShape } from "./Molding";
import { evaluateTyp, reify, reifyTyp } from "./Normalization";
import { SemTyp } from "./Semantics";
import { Dbl, freshId, hole, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export function genPalette(shape: HoleShape): Syn[] {
  let T = shape.T;
  let plt: Syn[] = [];

  // f ==> f ? ... ? where f : Π (x1 : A1) ... (xn : An) . B(x1, ..., xn)
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
        if (item.T.case !== "hol" && item.T.case !== "pie")
          plt.push(genArgHoles({case: "var", id: item.id, dbl}, evaluateTyp(item.T, semCtx)));
        dbl++;
      },
      rev(shape.ctx)
    );
    
  }

  switch (T.case) {
    case "uni": {
      // TODO: interface for picking level
      plt.push({case: "uni", lvl: predLevel(T.lvl)});
      plt.push({case: "pie", id: freshId(), dom: hole, cod: hole});
      plt.push({case: "let", id: freshId(), dom: hole, arg: hole, bod: hole});
      paletteFromCtx()
      break;
    }
    case "pie": {
      plt.push({case: "lam", id: T.id, bod: hole});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": paletteFromCtx(); break; // TODO
    case "var": paletteFromCtx(); break; // TODO
  }
  plt.reverse();
  return plt;
}

