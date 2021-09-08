export type HoleIx = {
  top: HoleIxTop,
  steps: HoleIxSteps
}

export type HoleIxTop
  = {case: "sig"}
  | {case: "imp"}
  | {case: "pfb", subcase: "sig" | "imp", i: number}

export type HoleIxSteps = HoleIxStep[];

export type HoleIxStep
  = {case: "pie", subcase: "dom" | "cod"}
  | {case: "lam"}
  | {case: "let", subcase: "dom" | "arg" | "bod"}
  | {case: "app", subcase: "app" | "arg"}

export function topHoleIx(top: HoleIxTop): HoleIx
  {return {top: top, steps: []}}

export function eqHoleIx(ix1: HoleIx, ix2: HoleIx): boolean {
  let checkTop = false;
  switch (ix1.top.case) {
    case "sig": checkTop = ix1.top.case === ix2.top.case; break;
    case "imp": checkTop = ix1.top.case === ix2.top.case; break;
    case "pfb": checkTop = ix1.top.case === ix2.top.case && ix1.top.subcase === ix2.top.subcase && ix1.top.i === ix2.top.i; break;
  }
  let checkSteps = eqHoleIxSteps(ix1.steps, ix2.steps);
  return checkTop && checkSteps;
}

export function eqHoleIxSteps(steps1: HoleIxSteps, steps2: HoleIxSteps): boolean {
  let res = true;
  if (steps1.length !== steps2.length) return false;
  for (let i = 0; i < steps1.length; i++)
    res = res && eqHoleIxStep(steps1[i], steps2[i]);
  return res;
}

export function eqHoleIxStep(step1: HoleIxStep, step2: HoleIxStep): boolean {
  switch (step1.case) {
    case "pie": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "lam": return step1.case === step2.case;
    case "let": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "app": return step1.case === step2.case && step1.subcase === step2.subcase;
  }
}

export function cloneHoleIx(ix: HoleIx): HoleIx {
  return {
    top: ix.top,
    steps: ix.steps.map(step => step)
  };
}