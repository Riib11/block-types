import { ChangeEventHandler } from "react";
import { MouseEventHandler } from "react";
import App from "../App";
import { atRev, cons, nil, PList } from "../data/PList";
import { Prefab, update } from "../State";
import { Ids } from "./Ctx";
import { cloneHoleIx, eqHoleIx, HoleIx, topHoleIx } from "./HoleIx";
import { Dbl, Id, Level, Syn, SynNeu } from "./Syntax";

export type Mode = "display" | "palette";

export class Renderer {
  private app: App;
  private mode: Mode;
  private pncParL: JSX.Element;
  private pncParR: JSX.Element;
  private pncCol: JSX.Element;
  private pncDot: JSX.Element;
  private pncEq: JSX.Element;
  private pncLet: JSX.Element;
  private pncPie: JSX.Element;
  private pncLam: JSX.Element;
  private pncUni: JSX.Element;
  private pncIn: JSX.Element;

  constructor(app: App, mode: Mode) {
    this.app = app;
    this.mode = mode;
    
    this.pncParL = this.mode === "palette" ? (<span className="syn paren">(</span>) : (<span className="syn paren left">(</span>);
    this.pncParR = this.mode === "palette" ? (<span className="syn paren">)</span>) : (<span className="syn paren right">)</span>);
    this.pncCol = (<span className="syn col">:</span>);
    this.pncDot = (<span className="syn dot">.</span>);
    this.pncEq = (<span className="syn eq">=</span>);
    this.pncLet = (<span className="syn let">let</span>);
    this.pncPie = (<span className="syn pi">Π</span>);
    this.pncLam = (<span className="syn lam">λ</span>);
    this.pncUni = (<span className="syn uni">U</span>);
    this.pncIn = (<span className="syn in">in</span>);
  }

  renderSig(t: Syn): JSX.Element {
    let ix = topHoleIx({case: "sig"});
    return this.renderSyn(t, ix);
  }

  renderImp(t: Syn): JSX.Element {
    let ix = topHoleIx({case: "imp"});
    return this.renderSyn(t, ix);
  }

  // i: index of prefab
  renderPfb(pfb: Prefab, i: number): JSX.Element {
    return (
      <div className="pfb">
        <div className="sig">{this.renderSyn(pfb.T, topHoleIx({case: "pfb", i, subcase: "sig"}))}</div>
        <div className="imp">{this.renderSyn(pfb.T, topHoleIx({case: "pfb", i, subcase: "imp"}))}</div>
      </div>
    );
  }

  renderSyn(t: Syn, ix: HoleIx, ctx: Ids = nil()): JSX.Element {
    let ren = this;
    function go(t: Syn, ctx: Ids): JSX.Element {
      let e: JSX.Element = (<span></span>);
      switch (t.case) {
        case "uni": e = (<span className="term uni">{ren.pncUni}<sub>{ren.renderLevel(t.lvl)}</sub></span>); break;
        case "pie": {
          ix.steps.push({case: "pie", subcase: "dom"});
          let dom = go(t.dom, ctx);
          ix.steps.pop();
          ix.steps.push({case: "pie", subcase: "cod"});
          let cod = go(t.cod, cons(t.id, ctx));
          ix.steps.pop();
          return (<span className="term pi">{ren.pncParL}{ren.pncPie} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncDot} {cod}{ren.pncParR}</span>);
        }
        case "lam": {
          ix.steps.push({case: "lam"});
          let bod = go(t.bod, cons(t.id, ctx));
          ix.steps.pop();
          return (<span className="term lam">{ren.pncParL}{ren.pncLam} {ren.renderId(t.id, true)} {ren.pncDot} {bod}{ren.pncParR}</span>);
        }
        case "let": {
          ix.steps.push({case: "let", subcase: "dom"});
          let dom = go(t.dom, ctx);
          ix.steps.pop();
          ix.steps.push({case: "let", subcase: "arg"});
          let arg = go(t.arg, ctx);
          ix.steps.pop();
          ix.steps.push({case: "let", subcase: "bod"});
          let bod = go(t.bod, cons(t.id, ctx));
          ix.steps.pop();
          return (<span className="term let">{ren.pncParL}{ren.pncLet} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncEq} {arg} {ren.pncIn} {bod}{ren.pncParR}</span>);
        }
        case "app": return (<span className="term neu">{ren.pncParL}{goNeu(t,ctx)}{ren.pncParR}</span>);
        case "var": return (<span className="term neu">{goNeu(t, ctx)}</span>);
        case "hol": return (<span className="term hol">{ren.renderHole(ix)}</span>);
      }
      return e;
    }
    function goNeu(t: SynNeu, ctx: Ids): JSX.Element {
      switch (t.case) {
        case "app": {
          ix.steps.push({case: "app", subcase: "app"});
          let app = go(t.app, ctx);
          ix.steps.pop();
          ix.steps.push({case: "app", subcase: "arg"});
          let arg = go(t.arg, ctx);
          ix.steps.pop();
          return (<span className="term app">{app} {arg}</span>);
        }
        case "var": return (<span className="term var">{ren.renderVar(t.dbl, ctx)}</span>);
      }
    }
    return go(t, ctx);
  }

  renderLevel(lvl: Level): JSX.Element
    {return lvl === "omega" ? (<span>ω</span>) : (<span>{lvl}</span>)}

  renderId(id: Id, editable: boolean = false): JSX.Element {
    let ren = this;
    if (editable && this.mode !== "palette") {
      let onChange: ChangeEventHandler<HTMLInputElement> = event => {
        let elem = event.target;
        update(ren.app.state, {case: "rename", id: id, lbl: elem.value});
        ren.app.setState(ren.app.state);
      }
      let input = (
        <input
          className="term id input"
          onChange={onChange}
          style={{width: `${id.lbl.length}ch`}}
          value={id.lbl}
        ></input>
      );
      return (<span className="term id">{input}</span>);
    } else {
      return (<span className="term id">{id.lbl}</span>);
    }
  }

  renderVar(dbl: Dbl, ctx: Ids): JSX.Element {
    return (<span className="var">{atRev(dbl, ctx).lbl}</span>)
  }

  renderHole(ix: HoleIx): JSX.Element {
    let s = `?`;
    let ixLoc = cloneHoleIx(ix);
    switch (this.mode) {
      case "display": {
        if (this.app.state.ix !== undefined && eqHoleIx(ixLoc, this.app.state.ix)) {
          return (<span className="holeId focussed">{s}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            update(this.app.state, {case: "select", ix: ixLoc});
            this.app.update();
          }
          return (<span className="holeId unfocussed" onClick={onClick}>{s}</span>)
        }
      }
      case "palette": {
        return (<span className="holeId">{s}</span>)
      }
    }
  }
}