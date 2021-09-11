import { app, len, map, nil, PList, single, zip } from "../data/PList";

export type HolePath = {
  top: HolePathTop,
  steps: HolePathSteps
}

export type HolePathTop
  = {case: "sig"}
  | {case: "imp"}
  | {case: "buf", i: number}

// export type HolePathSteps = HolePathStep[];

export type HolePathSteps = PList<HolePathStep>;

export type HolePathStep
  = {case: "pie", subcase: "dom" | "cod"}
  | {case: "lam"}
  | {case: "let", subcase: "dom" | "arg" | "bod"}
  | {case: "app", subcase: "app" | "arg"}

export function topHolePath(top: HolePathTop): HolePath
  {return {top: top, steps: nil()}}

export function stepHolePath(ix: HolePath, step: HolePathStep): HolePath
  {return {top: ix.top, steps: stepHolePathSteps(ix.steps, step)}}

export function stepHolePathSteps(steps: HolePathSteps, step: HolePathStep): HolePathSteps
  {return app(steps, single(step))}
  // {return cons(step, steps)}

export function eqHolePath(ix1: HolePath, ix2: HolePath): boolean {
  let checkTop = false;
  switch (ix1.top.case) {
    case "sig": checkTop = ix1.top.case === ix2.top.case; break;
    case "imp": checkTop = ix1.top.case === ix2.top.case; break;
    case "buf": checkTop = ix1.top.case === ix2.top.case && ix1.top.i === ix2.top.i; break;
  }
  let checkSteps = eqHolePathSteps(ix1.steps, ix2.steps);
  return checkTop && checkSteps;
}

export function eqHolePathSteps(steps1: HolePathSteps, steps2: HolePathSteps): boolean {
  let res = true;
  if (len(steps1) !== len(steps2)) return false;
  map(
    item => res = res && eqHolePathStep(item[0], item[1]),
    zip(steps1, steps2)
  );
  return res;
}

export function eqHolePathStep(step1: HolePathStep, step2: HolePathStep): boolean {
  switch (step1.case) {
    case "pie": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "lam": return step1.case === step2.case;
    case "let": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "app": return step1.case === step2.case && step1.subcase === step2.subcase;
  }
}