import { app, atRev, cons, len, map, nil, PList, single, toArray } from "../data/PList";
import { HoleShape } from "./Molding";
import { evaluateTyp, reify, reifyTyp } from "./Normalization";
import { SemTyp } from "./Semantics";
import { Dbl, freshId, hole, predLevel, showSyn, Syn, SynNeu, SynVar } from "./Syntax";

export function genPalette(shape: HoleShape): Syn[] {
  console.log("genPalette");
  console.log("shape"); console.log(shape);

  let T = shape.T;
  let plt: Syn[] = [];

  // x ==> x ? ... ? where x : Π (x1 : A1) ... (xn : An) . B(x1, ..., xn)
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
    let dbl: Dbl = 0;
    map(
      item => plt.push(genArgHoles({case: "var", id: item.id, dbl}, evaluateTyp(item.T))),
      shape.ctx
    );
    dbl++;
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
      plt.push({case: "lam", id: freshId(), bod: hole});
      break;
    }
    case "hol": break; // a term hole's surface type hole must be filled first
    case "app": paletteFromCtx(); break; // TODO
    case "var": paletteFromCtx(); break; // TODO
  }
  return plt;
}

