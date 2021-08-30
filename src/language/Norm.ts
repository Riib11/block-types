/*
# Domains
*/

/*
## Syntactic domain
*/

// Syntactic normal form
export type Syn
  = {case: "uni", lvl: Lvl} // U_i
  | {case: "pi", id: Id, dom: Syn, bod: Syn} // Π x : A . B
  | {case: "lam", bod: Syn} // (λ b)
  | {case: "let", id: Id, dom: Syn, arg: Syn, bod: Syn} // let x : A = a in b
  | SynNe
;
// Syntactic neutral form
export type SynNe
  = {case: "app", app: SynNe, arg: Syn} // f a
  | {case: "var", ix: Ix} // x  (DeBruijn-index)
;
export type Lvl = number;
export type Ix  = number;
export type Id  = string;

export function showSyn(t: Syn): string {
  switch (t.case) {
    case "uni": return `U${t.lvl}`;
    case "pi": return `(Π ${t.id} : ${showSyn(t.dom)} . ${showSyn(t.bod)})`;
    case "lam": return `(λ ${showSyn(t.bod)})`;
    case "let": return `let ${t.id} : ${showSyn(t.dom)} = ${showSyn(t.arg)} in ${showSyn(t.bod)}`;
    case "app": return `${showSyn(t.app)} ${showSyn(t.arg)}`;
    case "var": return t.ix.toString();
  }
}

/*
## Semantic domain
*/

export type Sem = SemT | ((g: GSem) => Sem) | Syn;
export type SemT // :: Ctx -> Type -> Type
  = {case: "uni", lvl: Lvl}
  | {case: "pi", 
      id: Id,
      dom: GSem,                      // dom: GSem G1 Type
      bod: (ren: Ren, e: GSem) => Sem // bod: (ren: Ren G1 G2) -> Sem G2 (A ren) -> Sem G2 Type
    } // Π x : A . B
  | SynNe

// GSem = ren -> Sem
export type GSem = (ren: Ren) => Sem

// GSemT = ren -> SemT
export type GSemT = (ren: Ren) => SemT;

/*
# Renaming and Substitution
*/

export type Ctx = GSemT[];

// Ren G1 G2 = Var G1 T -> Var G2 ?T
type Ren = (x:Ix) => Ix;

// Sub G1 G2 = Var G1 T -> GSem G2 ?T
type Sub = (x:Ix) => GSem;

export const idRen: Ren = x => x;

const weaken1Ren: Ren = x => x + 1;

function forget1Ren(ren: Ren): Ren
  {return x => ren(x + 1);}

function idSub(ctx: Ctx): Sub
  {return (x: Ix) => (ren: Ren) => reflect(ctx[x](ren), {case: "var", ix: ren(x)});}

function transRR(ren1: Ren, ren2: Ren): Ren
  {return x => ren2(ren1(x));}

function transSR(sub: Sub, ren1: Ren): Sub
  {return (x: Ix) => (ren2: Ren) => sub(x)(transRR(ren1, ren2));}

function append1Sub(sub: Sub, g: GSem): Sub
  {return x => x === 0 ? g : sub(x - 1);}

/*
# Evaluation

Evaluation assumes that the input term is well-typed.
*/

// `evl` must be named so instead of `eval` since "strict mode" (whatever that
// means) disallows exporting a shadowing of a globally-defined name.
export function evl(e: Syn): Sem
  {return evlImpl(idSub([]), e);}

function evlImpl(sub: Sub, e: Syn): Sem {
  console.log("evlImpl");
  switch (e.case) {
    case "lam": return (g: GSem) => evlImpl(append1Sub(sub, g), e.bod);
    case "let": {
      let GsemE: GSem = (ren: Ren) => evlImpl(transSR(sub, ren), e.arg);
      return (evlImpl(append1Sub(sub, GsemE), e.bod));
    }
    case "pi": {
      return ({
        case: "pi",
        id: e.id,
        dom: (ren: Ren)          => evlImpl(transSR(sub, ren), e.dom),
        bod: (ren: Ren, a: GSem) => evlImpl(append1Sub(transSR(sub, ren), a), e.bod)
      });
    }
    case "uni": return {case: "uni", lvl: e.lvl} as Sem;
    case "app": return (evlImpl(sub, e.app) as (g: GSem) => Sem)((ren: Ren) => evlImpl(transSR(sub, ren), e.arg));
    case "var": return (sub(e.ix))(idRen);
  }
}

/*
Reflection
*/

export function reflect(T: SemT, e: SynNe): Sem {
  switch (T.case) {
    case "uni": return e;
    case "pi": return (a: GSem) => reflect(T.bod(idRen, a) as SemT,
                                           {case: "app", app: e, arg: reify(T.dom(idRen) as SemT, a)})
    case "app":
    case "var": return e; 
  }
}

export function reify(T: SemT, e: GSem): Syn {
  console.log("reify");
  switch (T.case) {
    case "uni": {
      let eT = e(idRen) as SemT;
      switch (eT.case) {
        case "uni": return {case: "uni", lvl: eT.lvl};
        case "pi": {
          let A: GSem = eT.dom;
          let B: (ren: Ren, e: GSem) => Sem = eT.bod;
          return {
            case: "pi",
            id: eT.id,
            dom: reify({case: "uni", lvl: T.lvl}, eT.dom),
            bod: reify({case: "uni", lvl: T.lvl}, 
                       (ren1: Ren) => B(forget1Ren(ren1),
                       (ren2: Ren) => reflect(A(transRR(forget1Ren(ren1), ren2)) as SemT, {case: "var", ix: ren2(0)})))
          };
        }
        case "app": return eT;
        case "var": return eT;
      }
      break;
    }
    case "pi": {
      let A: GSem = T.dom;
      let B: (ren: Ren, e: GSem) => Sem = T.bod;
      return {
        case: "lam",
        bod: reify(
              B(weaken1Ren, (ren: Ren) => reflect(A(forget1Ren(ren)) as SemT, {case: "var", ix: ren(0)})) as SemT,
              (ren1: Ren) => (e(forget1Ren(ren1)) as (g: GSem) => Sem)((ren2: Ren) => reflect(A(transRR(forget1Ren(ren1), ren2)) as SemT, {case: "var", ix: ren2(ren1(0))})))
      };
    }
    case "app":
    case "var": return e(idRen) as Syn;
  }
}

/*
# Normalization
*/

export function norm(T: Syn, e: Syn): Syn
  {return reify(evl(T) as SemT, (ren: Ren) => evlImpl(transSR(idSub([]), ren), e));}


/*
# Examples
*/

export type Example = {
  type: Syn,
  term: Syn,
  result: Syn
}

// Example 1 (matches ref)

export const example1: Example = (() => {
  let type: Syn = {
    case: "pi",
    id: "A",
    dom: {case: "uni", lvl: 5}, 
    bod: {case: "uni", lvl: 5}
  };
  let term: Syn = {
    case: "lam",
    bod: {
      case: "let",
      id: "A",
      dom: {case: "uni", lvl: 5},
      arg: {case: "var", ix: 0},
      bod: {case: "var", ix: 0}
    }
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();

// Example 2 (matches ref)

export const example2: Example = (() => {
  let type: Syn = {case: "uni", lvl: 5};
  let term: Syn = {
    case: "pi",
    id: "P",
    dom: {
      case: "pi",
      id: "_",
      dom: {case: "uni", lvl: 4},
      bod: {case: "uni", lvl: 4}
    },
    bod: {case: "app", app: {case: "var", ix: 0}, arg: {case: "uni", lvl: 3}}
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();

// Example 3 (matches ref)

export const example3: Example = (() => {
  let type: Syn = {
    case: "pi",
    id: "T",
    dom: {case: "uni", lvl: 5},
    bod: {
      case: "pi",
      id: "_",
      dom: {case: "var", ix: 0},
      bod: {case: "var", ix: 1}
    }
  };
  let term: Syn = {
    case: "lam",
    bod: {
      case: "lam",
      bod: {case: "var", ix: 0}
    }
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();

// Example 4

export const example4: Example = (() => {
  let type: Syn = {
    case: "pi",
    id: "A",
    dom: {case: "uni", lvl: 0},
    bod: {case: "uni", lvl: 0}
  };
  let term: Syn = {
    case: "lam",
    bod: {
      case: "let",
      id: "A1",
      dom: {case: "uni", lvl: 0},
      arg: {case: "var", ix: 0},
      bod: {
        case: "let",
        id: "A2",
        dom: {case: "uni", lvl: 0},
        arg: {case: "var", ix: 0},
        bod: {case: "var", ix: 0}
      }
    }
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();

// Example 5

export const example5: Example = (() => {
  // Π A : U0 . Π B : U0 . U1
  let type: Syn = {
    case: "pi",
    id: "A",
    dom: {case: "uni", lvl: 0},
    bod: {
      case: "pi",
      id: "B",
      dom: {case: "uni", lvl: 0},
      bod: {case: "uni", lvl: 1}
    }
  };
  // λ A . λ B . let A' : U0 = A in
  //             let B' : U0 = B in
  //             Π x : A' . B'
  let term: Syn = {
    case: "lam",
    bod: {
      case: "lam",
      bod: {
        case: "let", // let A' : U0 = A
        id: "A'",
        dom: {case: "uni", lvl: 0},
        arg: {case: "var", ix: 1},
        bod: {
          case: "let", // let B' : U0 = B
          id: "B'",
          dom: {case: "uni", lvl: 0},
          arg: {case: "var", ix: 1},
          bod: {
            case: "pi", // Π x : A' . B'
            id: "x",
            dom: {case: "var", ix: 1},
            bod: {case: "var", ix: 1}
          }
        }
      }
    }
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();

// Example 6

export const example6: Example = (() => {
  let type: Syn = {
    case: "pi",
    id: "A",
    dom: {case: "uni", lvl: 0},
    bod: {case: "uni", lvl: 0}
  };
  let term: Syn = {
    case: "lam",
    bod: {
      case: "let",
      id: "A1",
      dom: {case: "let", id: "B", dom: {case: "uni", lvl: 1}, arg: {case: "uni", lvl: 0}, bod: {case: "var", ix: 0}},
      arg: {case: "var", ix: 0},
      bod: {
        case: "let",
        id: "A2",
        dom: {case: "uni", lvl: 0},
        arg: {case: "var", ix: 0},
        bod: {case: "var", ix: 0}
      }
    }
  };
  let result: Syn = norm(type, term);
  return {type, term, result};
})();