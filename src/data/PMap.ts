export type PMap<K, V>
  = {case: "nil"}
  | {case: "cons", k: K, v: V, m: PMap<K, V>}
;

export function nil<K, V>(): PMap<K, V> {return {case: "nil"}};

export function lookup<K, V>(m: PMap<K, V>, k: K): V {
  switch (m.case) {
    case "nil": throw new Error(`The key ${k} was not found in the PMap ${m}`);
    case "cons": return m.k === k ? m.v : lookup(m.m, k);
  }
}

export function insert<K, V>(m: PMap<K, V>, k: K, v: V): PMap<K, V> {
  return {case: "cons", k, v, m};
}