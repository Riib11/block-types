import { MouseEventHandler } from "react";
import App from "../App";
import { update } from "../State";
import { HoleId, Id, Neu, Prgm, Term, Var } from "./Syntax";

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
      case "jud": return (<span className="prgm jud">{this.renderTerm(p.term)} : {this.renderTerm(p.type)}</span>);
    }
  }

  renderTerm(t: Term): JSX.Element {
    switch (t.case) {
      case "uni": return (<span className="term uni">U<sub>{t.lvl}</sub></span>)
      case "pi": return (<span className="term pi">(Π {this.renderId(t.id)} : {this.renderTerm(t.dom)} . {this.renderTerm(t.bod)})</span>)
      case "lam": return (<span className="term lam">(λ {this.renderTerm(t.bod)})</span>);
      // case "app": return (<span className="term app">({this.renderVar(t.app)} {intercalate(t.args.map(arg => this.renderTerm(arg)), (<span> </span>))})</span>)
      case "neu": return (<span className="term neu">({this.renderNeu(t.neu)})</span>);
      case "let": return (<span className="term let">(let {this.renderId(t.id)} : {this.renderTerm(t.dom)} = {this.renderTerm(t.arg)} in {this.renderTerm(t.bod)})</span>)
      case "hol": return (<span className="term hol">{this.renderHoleId(t.id)}</span>)
    }
  }

  renderNeu(neu: Neu): JSX.Element {
    switch (neu.case) {
      case "var": return (<span className="term var">{this.renderVar(neu.var)}</span>);
      case "app": return (<span className="term app">{this.renderNeu(neu.app)} {this.renderTerm(neu.arg)}</span>);
    }
  }

  renderId(id: Id): JSX.Element {
    return (<span className="id">{id}</span>);
  }

  renderVar(v: Var): JSX.Element {
    return (<span className="var">{v}</span>)
  }

  renderHoleId(id: HoleId): JSX.Element {
    switch (this.mode) {
      case "display": {
        if (id === this.app.state.id) {
          return (<span className="holeId focussed">?{id.ix}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            let state = update(this.app.state, {case: "select", id});
            this.app.setState(state);
          }
          return (<span className="holeId unfocussed" onClick={onClick}>?{id.ix}</span>)
        }
      }
      case "palette": {
        return (<span className="holeId">?{id.ix}</span>)
      }
    }
  }
}