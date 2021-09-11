import { ChangeEventHandler } from "react";
import { MouseEventHandler } from "react";
import App from "../App";
import { at, atRev, cons, nil, PList } from "../data/PList";
import { Buffer, update } from "../State";
import { Ids } from "./Ctx";
import { eqHolePath, HolePath, HolePathSteps, stepHolePath, topHolePath } from "./HolePath";
import { infer } from "./Inference";
import { mold } from "./Molding";
import { Id, Level, Syn, SynNeu } from "./Syntax";

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
    {return this.renderSyn(t, topHolePath({case: "sig"}))}

  renderImp(t: Syn): JSX.Element
    {return this.renderSyn(t, topHolePath({case: "imp"}))}

  // i: index of Buffer
  renderBuf(buf: Buffer, i: number): JSX.Element {
    let ren = this;
    let onClickSubmit: MouseEventHandler = event => {
      update(ren.app.state, {case: "submit buffer", i});
      ren.app.update();
    }
    let onClickDelete: MouseEventHandler = event => {
      update(ren.app.state, {case: "delete buffer", i});
      ren.app.update();
    }
    let shape = mold(this.app.state, buf.path);
    // goal type
    let Tgoal = shape.T;
    // current type
    let Tcurr = infer(buf.t, shape.ctx);
    return (
      <div className="Buffer">
        <div className="submit" onClick={onClickSubmit}></div>
        <div className="delete" onClick={onClickDelete}></div>
        <div className="box">
          <div className="sig">{this.renderSyn(Tgoal, buf.path)}</div>
          <div className="typ">{this.renderSyn(Tcurr, buf.path)}</div>
          <div className="imp">{this.renderSyn(buf.t, topHolePath({case: "buf", i}))}</div>
        </div>
     </div>
    );
  }

  // TODO: use an immutable queue for ix.steps rather than this messy mutable stuff. I seems that its getting mixed up somewhere, and doesn't update the state's ix properly...

  renderSyn(t: Syn, ix: HolePath): JSX.Element {
    let ren = this;
    function go(t: Syn, ix: HolePath, top: boolean = false): JSX.Element {
      switch (t.case) {
        case "uni": return (<span className="term uni">{ren.pncUni}<sub>{ren.renderLevel(t.lvl)}</sub></span>);
        case "pie": {
          let dom = go(t.dom, stepHolePath(ix, {case: "pie", subcase: "dom"}));
          let cod = go(t.cod, stepHolePath(ix, {case: "pie", subcase: "cod"}));
          return (<span className="term pi">{top ? "" : ren.pncParL}{ren.pncPie} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncDot} {cod}{top ? "" : ren.pncParR}</span>);
        }
        case "lam": {
          let bod = go(t.bod, stepHolePath(ix, {case: "lam"}));
          return (<span className="term lam">{top ? "" : ren.pncParL}{ren.pncLam} {ren.renderId(t.id, true)} {ren.pncDot} {bod}{top ? "" : ren.pncParR}</span>);
        }
        case "let": {
          let dom = go(t.dom, stepHolePath(ix, {case: "let", subcase: "dom"}));
          let arg = go(t.arg, stepHolePath(ix, {case: "let", subcase: "arg"}));
          let bod = go(t.bod, stepHolePath(ix, {case: "let", subcase: "bod"}));
          return (<span className="term let">{top ? "" : ren.pncParL}{ren.pncLet} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncEq} {arg} {ren.pncIn} {bod}{top ? "" : ren.pncParR}</span>);
        }
        case "app": return (<span className="term neu">{top ? "" : ren.pncParL}{goNeu(t)}{top ? "" : ren.pncParR}</span>);
        case "var": return (<span className="term neu">{goNeu(t)}</span>);
        case "hol": return (<span className="term hol">{ren.renderHole(ix)}</span>);
      }
    }
    function goNeu(t: SynNeu): JSX.Element {
      switch (t.case) {
        case "app": {
          let app = go(t.app, stepHolePath(ix, {case: "app", subcase: "app"}));
          let arg = go(t.arg, stepHolePath(ix, {case: "app", subcase: "arg"}));
          return (<span className="term app">{app} {arg}</span>);
        }
        case "var": return (<span className="term var">{ren.renderId(t.id)}</span>);
      }
    }
    return go(t, ix, true);
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

  // renderVar(dbl: Dbl, ctx: Ids): JSX.Element {
  //   return (<span className="var">{(atRev(dbl, ctx) as Id).lbl}</span>)
  // }

  renderHole(path: HolePath): JSX.Element {
    let s = `?`;
    switch (this.mode) {
      case "display": {
        if (this.app.state.path !== undefined && eqHolePath(path, this.app.state.path)) {
          return (<span className="holeId focussed">{s}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            update(this.app.state, {case: "select", path});
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