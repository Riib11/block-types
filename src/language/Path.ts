import { app, atRev, isNil, len, map, nil, PList, pop, shift, single, zip } from "../data/PList";
import { State } from "../State";
import { Syn, SynApp, SynLam, SynLet, SynPie } from "./Syntax";

export type Path = {
  top: PathTop,
  steps: PathSteps
}

export type PathTop
  = {case: "sig"}
  | {case: "imp"}
  | {case: "buf", i: number}

// export type PathSteps = PathStep[];

export type PathSteps = PList<PathStep>;

export type PathStep
  = {case: "pie", subcase: "dom" | "cod"}
  | {case: "lam"}
  | {case: "let", subcase: "dom" | "arg" | "bod"}
  | {case: "app", subcase: "app" | "arg"}

export function topPath(top: PathTop): Path
  {return {top: top, steps: nil()}}

export function stepPath(path: Path, step: PathStep): Path
  {return {top: path.top, steps: stepPathSteps(path.steps, step)}}

export function stepPathSteps(steps: PathSteps, step: PathStep): PathSteps
  {return app(steps, single(step))}
  // {return cons(step, steps)}

export function eqPath(path1: Path, path2: Path): boolean {
  let checkTop = false;
  switch (path1.top.case) {
    case "sig": checkTop = path1.top.case === path2.top.case; break;
    case "imp": checkTop = path1.top.case === path2.top.case; break;
    case "buf": checkTop = path1.top.case === path2.top.case && path1.top.i === path2.top.i; break;
  }
  let checkSteps = eqPathSteps(path1.steps, path2.steps);
  return checkTop && checkSteps;
}

export function eqPathSteps(steps1: PathSteps, steps2: PathSteps): boolean {
  let res = true;
  if (len(steps1) !== len(steps2)) return false;
  map(
    item => res = res && eqPathStep(item[0], item[1]),
    zip(steps1, steps2)
  );
  return res;
}

export function eqPathStep(step1: PathStep, step2: PathStep): boolean {
  switch (step1.case) {
    case "pie": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "lam": return step1.case === step2.case;
    case "let": return step1.case === step2.case && step1.subcase === step2.subcase;
    case "app": return step1.case === step2.case && step1.subcase === step2.subcase;
  }
}

// Move the end of a path 1 step in a direction.
export function movePath(path: Path, dir: "left" | "right" | "up" | "down", state: State): Path {
  console.log("=============");
  console.log("movePath");
  console.log("path"); console.log(path);
  console.log("dir"); console.log(dir);

  let res = pop(path.steps);
  if (res !== undefined) {
    let [stepParent, step] = res;
    let pathNew = {top: path.top, steps: stepParent};
    switch (dir) {
      case "up": return pathNew;
      case "down": {
        let t: Syn = walkPath(path, state);
        switch (t.case) {
          case "pie": return stepPath(path, {case: "pie", subcase: "dom"});
          case "lam": return stepPath(path, {case: "lam"});
          case "let": return stepPath(path, {case: "let", subcase: "dom"});
          case "app": return stepPath(path, {case: "app", subcase: "app"});
          default: return path;
        }
      }
      case "left": {
        switch (step.case) {
          case "pie": {
            switch (step.subcase) {
              case "dom": return path;
              case "cod": return stepPath(pathNew, {case: "pie", subcase: "dom"});
            }
            break;
          }
          case "lam": return path;
          case "let": {
            switch (step.subcase) {
              case "dom": return path;
              case "arg": return stepPath(pathNew, {case: "let", subcase: "dom"});
              case "bod": return stepPath(pathNew, {case: "let", subcase: "arg"});
            }
            break;
          }
          case "app": {
            switch (step.subcase) {
              case "app": return path;
              case "arg": return stepPath(pathNew, {case: "app", subcase: "app"});
            }
            break;
          }
        }
        break;
      }
      case "right": {
        switch (step.case) {
          case "pie": {
            switch (step.subcase) {
              case "dom": return stepPath(pathNew, {case: "pie", subcase: "cod"});
              case "cod": return path;
            }
            break;
          }
          case "lam": return path;
          case "let": {
            switch (step.subcase) {
              case "dom": return stepPath(pathNew, {case: "let", subcase: "arg"});
              case "arg": return stepPath(pathNew, {case: "let", subcase: "bod"});
              case "bod": return path;
            }
            break;
          }
          case "app": {
            switch (step.subcase) {
              case "app": return stepPath(pathNew, {case: "app", subcase: "arg"});
              case "arg": return path;
            }
            break;
          }
        }
        break;
      }
    }
  } else if (dir === "down") {
    let t: Syn = walkPath(path, state);
    switch (t.case) {
      case "pie": return stepPath(path, {case: "pie", subcase: "dom"});
      case "lam": return stepPath(path, {case: "lam"});
      case "let": return stepPath(path, {case: "let", subcase: "dom"});
      case "app": return stepPath(path, {case: "app", subcase: "app"});
      default: return path;
    }
  } else return path;
}

export function walkPath(path: Path, state: State): Syn {
  function go(steps: PathSteps, t: Syn): Syn {
    let res = shift(steps);
    if (res !== undefined) {
      let [step, stepRest] = res;
      switch (step.case) {
        case "pie": {
          switch (step.subcase) {
            case "dom": return go(stepRest, (t as SynPie).dom);
            case "cod": return go(stepRest, (t as SynPie).cod);
          }
          break;
        }
        case "lam": return go(stepRest, (t as SynLam).bod);
        case "let": {
          switch (step.subcase) {
            case "dom": return go(stepRest, (t as SynLet).dom);
            case "arg": return go(stepRest, (t as SynLet).arg);
            case "bod": return go(stepRest, (t as SynLet).bod);
          }
          break;
        }
        case "app": {
          switch (step.subcase) {
            case "app": return go(stepRest, (t as SynApp).app);
            case "arg": return go(stepRest, (t as SynApp).arg);
          }
          break;
        }
      }
    } else return t;
  }

  switch (path.top.case) {
    case "sig": return go(path.steps, state.sig);
    case "imp": return go(path.steps, state.imp);
    case "buf": return go(path.steps, state.bufs[path.top.i].t);
  }
}