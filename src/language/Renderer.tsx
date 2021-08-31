import { ChangeEventHandler } from "react";
import { MouseEventHandler } from "react";
import App from "../App";
import { update } from "../State";
import { HoleId, Id, Prgm, Term, TermNe, Var } from "./Syntax";

export type Mode = "display" | "palette";

export class Renderer {
  app: App;
  mode: Mode;
  constructor(app: App, mode: Mode) {
    this.app = app;
    this.mode = mode;
  }

  renderPrgm(p: Prgm): JSX.Element {
    switch (p.case) {
      case "jud": {
        if (p.term.case === "let" || p.type.case === "let") {
          return (<span className="prgm jud">{this.renderTerm(p.term)} :<br/> {this.renderTerm(p.type)}</span>);
        } else {
          return (<span className="prgm jud">{this.renderTerm(p.term)} : {this.renderTerm(p.type)}</span>);
        }
      }
    }
  }

  renderTerm(t: Term, parent?: [Term, number]): JSX.Element {
    let synParL = this.mode === "palette" ? (<span className="syn paren">(</span>) : (<span className="syn paren left">(</span>);
    let synParR = this.mode === "palette" ? (<span className="syn paren">)</span>) : (<span className="syn paren right">)</span>);
    let synCol = (<span className="syn col">:</span>);
    let synDot = (<span className="syn dot">.</span>);
    let synEq = (<span className="syn eq">=</span>);

    let synLet = (<span className="syn let">let</span>);
    let synPi = (<span className="syn pi">Π</span>);
    let synLam = (<span className="syn lam">λ</span>);
    let synUni = (<span className="syn uni">U</span>);
    let synIn = (<span className="syn in">in</span>);

    switch (t.case) {
      case "uni": return (<span className="term uni">{synUni}<sub>{t.lvl}</sub></span>);
      case "pi": {
        return (<span className="term pi">{synParL}{synPi} {this.renderId(t.id, true)} {synCol} {this.renderTerm(t.dom, [t, 0])} {synDot} {this.renderTerm(t.bod, [t, 1])}{synParR}</span>);
      }
      case "lam": return (<span className="term lam">{synParL}{synLam} {this.renderTerm(t.bod, [t, 0])}{synParR}</span>);
      case "app":
      case "var": return (<span className="term neu">{synParL}{this.renderTermNe(t, [t, 0])}{synParR}</span>);
      case "let": {
        switch (parent?.[0].case) {
          default:    return (           <span className="term let">{synParL}{synLet} {this.renderId(t.id, true)} {synCol} {this.renderTerm(t.dom, [t, 0])} {synEq} {this.renderTerm(t.arg, [t, 1])} {synIn} {this.renderTerm(t.bod, [t, 2])}{synParR}</span>);
          case "let": return (<span><br/><span className="term let">{synParL}{synLet} {this.renderId(t.id, true)} {synCol} {this.renderTerm(t.dom, [t, 0])} {synEq} {this.renderTerm(t.arg, [t, 1])} {synIn} {this.renderTerm(t.bod, [t, 2])}{synParR}</span></span>);
        }
      }
      case "hol": return (<span className="term hol">{this.renderHoleId(t.id)}</span>);
    }
  }

  renderTermNe(t: TermNe, parent?: [Term, number]): JSX.Element {
    switch (t.case) {
      case "var": return (<span className="term var">{this.renderVar(t.var)}</span>);
      case "app": return (<span className="term app">{this.renderTermNe(t.app, [t, 0])} {this.renderTerm(t.arg, [t, 1])}</span>);
    }
  }

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

  renderVar(v: Var): JSX.Element {
    return (<span className="var">{v}</span>)
  }

  renderHoleId(id: HoleId): JSX.Element {
    let s = `?`;
    switch (this.mode) {
      case "display": {
        if (id === this.app.state.id) {
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