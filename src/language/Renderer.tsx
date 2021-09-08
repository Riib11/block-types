import { ChangeEventHandler } from "react";
import { MouseEventHandler } from "react";
import App from "../App";
import { atRev, cons, nil, PList } from "../data/PList";
import { Prefab, update } from "../State";
import { Ids } from "./Ctx";
import { eqHoleIx, HoleIx, HoleIxSteps, stepHoleIx, topHoleIx } from "./HoleIx";
import { Dbl, Id, Level, Syn, SynNeu } from "./Syntax";

export type Mode = "display" | "panel";

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
    
    this.pncParL = this.mode === "panel" ? (<span className="syn paren">(</span>) : (<span className="syn paren left">(</span>);
    this.pncParR = this.mode === "panel" ? (<span className="syn paren">)</span>) : (<span className="syn paren right">)</span>);
    this.pncCol = (<span className="syn col">:</span>);
    this.pncDot = (<span className="syn dot">.</span>);
    this.pncEq = (<span className="syn eq">=</span>);
    this.pncLet = (<span className="syn let">let</span>);
    this.pncPie = (<span className="syn pi">Π</span>);
    this.pncLam = (<span className="syn lam">λ</span>);
    this.pncUni = (<span className="syn uni">U</span>);
    this.pncIn = (<span className="syn in">in</span>);
  }

  renderSig(t: Syn): JSX.Element
    {return this.renderSyn(t, topHoleIx({case: "sig"}))}

  renderImp(t: Syn): JSX.Element
    {return this.renderSyn(t, topHoleIx({case: "imp"}))}

  // i: index of prefab
  renderPfb(pfb: Prefab, i: number): JSX.Element {
    return (
      <div className="prefab">
        <div className="sig">{this.renderSyn(pfb.T, topHoleIx({case: "pfb", i, subcase: "sig"}))}</div>
        <div className="imp">{this.renderSyn(pfb.T, topHoleIx({case: "pfb", i, subcase: "imp"}))}</div>
      </div>
    );
  }

  // TODO: use an immutable queue for ix.steps rather than this messy mutable stuff. I seems that its getting mixed up somewhere, and doesn't update the state's ix properly...

  renderSyn(t: Syn, ix: HoleIx, ctx: Ids = nil()): JSX.Element {
    let ren = this;
    function go(t: Syn, ix: HoleIx, ctx: Ids): JSX.Element {
      switch (t.case) {
        case "uni": return (<span className="term uni">{ren.pncUni}<sub>{ren.renderLevel(t.lvl)}</sub></span>);
        case "pie": {
          let dom = go(t.dom, stepHoleIx(ix, {case: "pie", subcase: "dom"}), ctx);
          let cod = go(t.cod, stepHoleIx(ix, {case: "pie", subcase: "cod"}), cons(t.id, ctx));
          return (<span className="term pi">{ren.pncParL}{ren.pncPie} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncDot} {cod}{ren.pncParR}</span>);
        }
        case "lam": {
          let bod = go(t.bod, stepHoleIx(ix, {case: "lam"}), cons(t.id, ctx));
          return (<span className="term lam">{ren.pncParL}{ren.pncLam} {ren.renderId(t.id, true)} {ren.pncDot} {bod}{ren.pncParR}</span>);
        }
        case "let": {
          let dom = go(t.dom, stepHoleIx(ix, {case: "let", subcase: "dom"}), ctx);
          let arg = go(t.arg, stepHoleIx(ix, {case: "let", subcase: "arg"}), ctx);
          let bod = go(t.bod, stepHoleIx(ix, {case: "let", subcase: "bod"}), cons(t.id, ctx));
          return (<span className="term let">{ren.pncParL}{ren.pncLet} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncEq} {arg} {ren.pncIn} {bod}{ren.pncParR}</span>);
        }
        case "app": return (<span className="term neu">{ren.pncParL}{goNeu(t, ctx)}{ren.pncParR}</span>);
        case "var": return (<span className="term neu">{goNeu(t, ctx)}</span>);
        case "hol": return (<span className="term hol">{ren.renderHole(ix)}</span>);
      }
    }
    function goNeu(t: SynNeu, ctx: Ids): JSX.Element {
      switch (t.case) {
        case "app": {
          let app = go(t.app, stepHoleIx(ix, {case: "app", subcase: "app"}), ctx);
          let arg = go(t.arg, stepHoleIx(ix, {case: "app", subcase: "arg"}), ctx);
          return (<span className="term app">{app} {arg}</span>);
        }
        case "var": return (<span className="term var">{ren.renderVar(t.dbl, ctx)}</span>);
      }
    }
    return go(t, ix, ctx);
  }

  renderLevel(lvl: Level): JSX.Element
    {return lvl === "omega" ? (<span>ω</span>) : (<span>{lvl}</span>)}

  renderId(id: Id, editable: boolean = false): JSX.Element {
    let ren = this;
    if (editable && this.mode !== "panel") {
      let onChange: ChangeEventHandler<HTMLInputElement> = event => {
        let elem = event.target;
        update(ren.app.state, {case: "rename", id, lbl: elem.value});
        ren.app.update();
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
    return (<span className="var">{(atRev(dbl, ctx) as Id).lbl}</span>)
  }

  renderHole(ix: HoleIx): JSX.Element {
    let s = `?`;
    switch (this.mode) {
      case "display": {
        if (this.app.state.ix !== undefined && eqHoleIx(ix, this.app.state.ix)) {
          return (<span className="holeId focussed">{s}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            update(this.app.state, {case: "select", ix});
            this.app.update();
          }
          return (<span className="holeId unfocussed" onClick={onClick}>{s}</span>)
        }
      }
      case "panel": {
        return (<span className="holeId">{s}</span>)
      }
    }
  }
}