/*
# Domains
*/

/*
## Syntactic domain
*/

// Syntactic normal form
export type Syn
  = {case: "uni", lvl: Lvl} // U_i
  | {case: "lam", bod: Syn} // (λ b)
  | {case: "pi", id: Id, dom: Syn, bod: Syn} // Π x : A . B
  | {case: "ne", ne: SynNe}
  | {case: "let", id: Id, dom: Syn, arg: Syn, bod: Syn} // let x : A = a in b
;
// Syntactic neutral form
export type SynNe
  = {case: "var", ix: Ix} // x  (DeBruijn-index)
  | {case: "app", app: SynNe, arg: Syn} // f a
;
export type Lvl = number;
export type Ix = number;
export type Id = string;

/*
## Semantic domain
*/

export type Sem = any;
export type SemT // :: Ctx -> Type -> Type
  = {case: "uni", lvl: Lvl}
  | {case: "pi", id: Id,
     dom: GSem,                     // dom: GSem G1 Type
     bod: (ren: Ren, e: Sem) => Sem // bod: (ren: Ren G1 G2) -> Sem G2 (A ren) -> Sem G2 Type
    } // Π x : A . B
  | {case: "ne", ne: SynNe}

// GSem = ren -> Sem
export type GSem = any

// GSemT = ren -> SemT
export type GSemT = any;

/*
# Renaming and Substitution
*/

export type Ctx = GSemT[];

// Ren G1 G2 = Var G1 T -> Var G2 ?T
type Ren = (x:Ix) => Ix;

// Sub G1 G2 = Var G1 T -> GSem G2 ?T
type Sub = (x:Ix) => GSem;

const idRen: Ren = x => x;

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

// TODO: output was originally of type Sem, but GSem seems correct
function evlImpl(sub: Sub, e: Syn): GSem {
  switch (e.case) {
    case "lam": return (g: GSem) => evlImpl(append1Sub(sub, g), e.bod);
    case "ne": return evlNeImpl(sub, e.ne);
    case "let": {
      let GsemE: GSem = (ren: Ren) => evlImpl(transSR(sub, ren), e);
      return (evlImpl(append1Sub(sub, GsemE), e.bod));
    }
    case "pi": {
      return ({
        case: "pi",
        id: e.id,
        dom: (ren: Ren)          => evlImpl(transSR(sub, ren), e.dom),
        bod: (ren: Ren, a: GSem) => evlImpl(append1Sub(transSR(sub, ren), a), e.bod),
      } as Sem);
    }
    case "uni": return {case: "uni", lvl: e.lvl} as Sem;
  }
}

function evlNeImpl(sub: Sub, e: SynNe): GSem {
  switch (e.case) {
    case "var": return (sub(e.ix))(idRen) as unknown as GSem;
    case "app": return (evlNeImpl(sub, e.app))((ren: Ren) => evlImpl(transSR(sub, ren), e.arg));
  }
}

/*
Reflection
*/

export function reflect(T: SemT, e: SynNe): Sem {
  switch (T.case) {
    case "uni": return {case: "ne", ne: e} as SemT;
    case "pi": return (a: Sem) => reflect(T.bod(idRen, a),
                                          {case: "app", app: e, arg: reify(T.dom(idRen), a)})
    case "ne": return {case: "ne", ne: e} as Syn;
  }
}

export function reify(T: SemT, e: GSem): Syn {
  switch (T.case) {
    case "uni": {
      let eT = e(idRen) as SemT;
      switch (eT.case) {
        case "uni": return {case: "uni", lvl: eT.lvl};
        case "pi": {
          let A = eT.dom;
          let B = eT.bod;
          return {
            case: "pi",
            id: eT.id,
            dom: reify({case: "uni", lvl: T.lvl}, eT.dom),
            bod: reify({case: "uni", lvl: T.lvl}, 
                       (ren1: Ren) => B(forget1Ren(ren1),
                       (ren2: Ren) => reflect(A(transRR(forget1Ren(ren1), ren2)), {case: "var", ix: ren2(0)})))
          };
        }
      }
      break;
    }
    case "pi": {
      let A = T.dom;
      let B = T.bod;
      return {
        case: "lam",
        bod: reify(B(weaken1Ren, (ren: Ren) => reflect(A(forget1Ren(ren)), {case: "var", ix: ren(0)})),
                   (ren1: Ren) => e(forget1Ren(ren1))
                                   ((ren2: Ren) => reflect(A(transRR(forget1Ren(ren1), ren2)),
                                                           {case: "var", ix: ren2(ren1(0))})))
      };
    }
    case "ne": return e(idRen);
  }
}

/*
# Normalization
*/

export function norm(T: Syn, e: Syn): Syn
  {return reify(evl(T), (ren: Ren) => evlImpl(transSR(idSub([]), ren), e));}

