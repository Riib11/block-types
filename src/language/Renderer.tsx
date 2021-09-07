import { ChangeEventHandler } from "react";
import { MouseEventHandler } from "react";
import App from "../App";
import { atRev, cons, nil, PList } from "../data/PList";
import { update } from "../State";
import { Dbl, HoleId, Id, Level, Prgm, Syn, SynNeu } from "./Syntax";

export type Mode = "display" | "palette";

export class Renderer {
  app: App;
  mode: Mode;
  pncParL: JSX.Element;
  pncParR: JSX.Element;
  pncCol: JSX.Element;
  pncDot: JSX.Element;
  pncEq: JSX.Element;
  pncLet: JSX.Element;
  pncPie: JSX.Element;
  pncLam: JSX.Element;
  pncUni: JSX.Element;
  pncIn: JSX.Element;

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

  renderPrgm(p: Prgm): JSX.Element {
    return (<span className="prgm jud">{this.renderSyn(p.t)} : {this.renderSyn(p.T)}</span>)
  }

  renderSyn(t: Syn, ctx: PList<Id> = nil()): JSX.Element {
    switch (t.case) {
      case "uni": return (<span className="term uni">{this.pncUni}<sub>{this.renderLevel(t.lvl)}</sub></span>);
      case "pie": return (<span className="term pi">{this.pncParL}{this.pncPie} {this.renderId(t.id, true)} {this.pncCol} {this.renderSyn(t.dom, ctx)} {this.pncDot} {this.renderSyn(t.cod, cons(t.id, ctx))}{this.pncParR}</span>);
      case "lam": return (<span className="term lam">{this.pncParL}{this.pncLam} {this.renderId(t.id, true)} {this.pncDot} {this.renderSyn(t.bod, cons(t.id, ctx))}{this.pncParR}</span>);
      case "app": return (<span className="term neu">{this.pncParL}{this.renderSynNeu(t,ctx)}{this.pncParR}</span>);
      case "var": return (<span className="term neu">{this.renderSynNeu(t,ctx)}</span>);
      case "let": return (<span className="term let">{this.pncParL}{this.pncLet} {this.renderId(t.id, true)} {this.pncCol} {this.renderSyn(t.dom, ctx)} {this.pncEq} {this.renderSyn(t.arg, ctx)} {this.pncIn} {this.renderSyn(t.bod, ctx)}{this.pncParR}</span>);
      case "hol": return (<span className="term hol">{this.renderHoleId(t.id)}</span>);
    }
  }

  renderSynNeu(t: SynNeu, ctx: PList<Id>): JSX.Element {
    switch (t.case) {
      case "var": return (<span className="term var">{this.renderVar(t.dbl, ctx)}</span>);
      case "app": return (<span className="term app">{this.renderSynNeu(t.app, ctx)} {this.renderSyn(t.arg, ctx)}</span>);
    }
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

  renderVar(dbl: Dbl, ctx: PList<Id>): JSX.Element {
    return (<span className="var">{atRev(dbl, ctx).lbl}</span>)
  }

  renderHoleId(id: HoleId): JSX.Element {
    let s = `?`;
    switch (this.mode) {
      case "display": {
        if (id === this.app.state.foc?.id) {
          return (<span className="holeId focussed">{s}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            let state = update(this.app.state, {case: "select", id});
            this.app.setState(state);
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