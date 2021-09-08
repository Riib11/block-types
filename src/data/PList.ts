export type PList<A>
  = {case: "nil"}
  | {case: "cons", h: A, t: PList<A>}
;

export function nil<A>(): PList<A> {return {case: "nil"}}

export function cons<A>(h: A, t: PList<A>): PList<A> {return {case: "cons", h, t}}

export function single<A>(h: A): PList<A> {return {case: "cons", h, t: nil()}}

export function at<A>(i: number, l: PList<A>): A | undefined {
  switch (l.case) {
    case "nil": return undefined;
    case "cons": return i === 0 ? l.h : at(i - 1, l.t);
  }      
}

export function atRev<A>(i: number, l: PList<A>): A | undefined
  {return at(len(l) - i - 1, l)}

export function rev<A>(l: PList<A>): PList<A> {
  switch (l.case) {
    case "cons": return app(rev(l.t), single(l.h));
    case "nil": return nil();
  }
}

export function len<A>(l: PList<A>): number {
  switch (l.case) {
    case "nil": return 0;
    case "cons": return 1 + len(l.t);
  }
}


export function foldl<A, B>(f: (b: B, a: A) => B, b: B, l: PList<A>): B {
  switch (l.case) {
    case "nil": return b;
    case "cons": return foldl(f, f(b, l.h), l.t);
  }
}

export function map<A, B>(f: (a: A) => B, l: PList<A>): PList<B> {
  return foldl((bs, a) => cons(f(a), bs), nil(), l);
}

export function toArray<A>(l: PList<A>): A[] {
  let arr: A[] = [];
  foldl((_, a) => arr.push(a), 0, l);
  return arr;
}

export function app<A>(l1: PList<A>, l2: PList<A>): PList<A> {
  switch (l1.case) {
    case "nil": return l2;
    case "cons": return cons(l1.h, app(l1.t, l2));
  }
}

export function zip<A, B>(l1: PList<A>, l2: PList<B>): PList<[A, B]> {
  switch (l1.case) {
    case "nil": return nil();
    case "cons": {
      switch (l2.case) {
        case "nil": return nil();
        case "cons": return cons([l1.h, l2.h], zip(l1.t, l2.t));
      }
    }
  }
}

export function shift<A>(l: PList<A>): [A, PList<A>] | undefined {
  switch (l.case) {
    case "nil": return undefined;
    case "cons": return [l.h, l.t];
  }
}

// Show

export function showPList<A>(l: PList<A>, show: (a: A) => string = ((a: A) => a) as unknown as (a: A) => string): string {
  switch (l.case) {
    case "nil": return `[]`;
    case "cons": return `[${foldl((s, a) => `${s}, ${show(a)}`, show(l.h), l.t)}]`;
  }
}