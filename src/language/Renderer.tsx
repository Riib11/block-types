import { MouseEventHandler, ChangeEventHandler } from "react";
import App from "../App";
import { at, atRev, cons, nil, PList } from "../data/PList";
import { Buffer, Tran, update } from "../State";
import { Ids } from "./Ctx";
import { eqPath, Path, PathSteps, stepPath, topPath } from "./Path";
import { infer } from "./Inference";
import { mold } from "./Molding";
import { Id, Level, showSyn, Syn, SynNeu } from "./Syntax";

export type Mode = "interactive" | "view";

export class Renderer {
  private app: App;
  public mode: Mode;
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

  constructor(app: App) {
    this.app = app;
    this.mode = "interactive";
    
    // this.pncParL = this.mode === "view" ? (<span className="syn paren">(</span>) : (<span className="syn paren left">(</span>);
    // this.pncParR = this.mode === "view" ? (<span className="syn paren">)</span>) : (<span className="syn paren right">)</span>);
    this.pncParL = (<span className="syn paren left">(</span>);
    this.pncParR = (<span className="syn paren right">)</span>);
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
    this.mode = "interactive";
    return this.renderSyn(t, topPath({case: "sig"}))
  }

  renderImp(t: Syn): JSX.Element {
    this.mode = "interactive";
    return this.renderSyn(t, topPath({case: "imp"}))
  }

  // i: index of Buffer
  renderBuf(buf: Buffer, i: number): JSX.Element {
    let ren = this;
    let onClickSubmit: MouseEventHandler = event => {
      ren.app.update(update(ren.app.state, {case: "submit buffer", i}));
    }
    let onClickDelete: MouseEventHandler = event => {
      ren.app.update(update(ren.app.state, {case: "delete buffer", i}));
    }
    let shape = mold(this.app.state, buf.path);
    // goal type
    let Tgoal = shape.T;
    // current type
    let Tcurr = infer(buf.t, shape.ctx);

    this.mode = "view";
    let sig = this.renderSyn(Tgoal, buf.path);

    this.mode = "view";
    let typ = this.renderSyn(Tcurr, buf.path);

    this.mode = "interactive";
    let imp = this.renderSyn(buf.t, topPath({case: "buf", i}))

    return (
      <div className="buffer">
        <div className="submit" onClick={onClickSubmit}></div>
        <div className="delete" onClick={onClickDelete}></div>
        <br/>
        <div className="box">
          <div className="sig">{sig}</div>
          <div className="typ">{typ}</div>
          <div className="imp">{imp}</div>
        </div>
     </div>
    );
  }

  renderPaletteItem(item: Tran, path: Path, selected: boolean): JSX.Element {
    this.mode = "view";
    let cls = `palette-item ${selected ? "selected" : ""}`;
    switch (item.case) {
      case "fill": {
        let onClick: MouseEventHandler = event => {
          this.app.update(update(this.app.state, {case: "fill", t: item.t}))
        }
        return (
          <div className={cls} onClick={onClick}>
            {this.renderSyn(item.t, path)}
          </div>
        );
      }
      case "create buffer": {
        let onClick: MouseEventHandler = event => {
          this.app.update(update(this.app.state, {
            case: "create buffer",
            buf: item.buf
          }));
        }
        return (
          <div className={cls} onClick={onClick}>
            {this.renderSyn(item.buf.t, path)}
          </div>
        );
      }
      default: return (<div className={cls}>Transition type "{item.case}" not yet supported by Renderer.</div>)
    }
  }

  // TODO: use an immutable queue for path.steps rather than this messy mutable stuff. I seems that its getting mpathed up somewhere, and doesn't update the state's path properly...

  renderSyn(t: Syn, path: Path): JSX.Element {
    let ren = this;
    function go(t: Syn, path: Path, top: boolean = false): JSX.Element {
      let selected: string = ren.mode === "interactive" && ren.app.state.path !== undefined && eqPath(path, ren.app.state.path) ? "selected" : "";
      switch (t.case) {
        case "uni": {
          let cls = `term unit ${selected}`;
          return (<span className={cls}>{ren.pncUni}<sub>{ren.renderLevel(t.lvl)}</sub></span>);
        }
        case "pie": {
          let dom = go(t.dom, stepPath(path, {case: "pie", subcase: "dom"}));
          let cod = go(t.cod, stepPath(path, {case: "pie", subcase: "cod"}));
          let cls = `term pi ${selected}`;
          return (<span className={cls}>{top ? "" : ren.pncParL}{ren.pncPie} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncDot} {cod}{top ? "" : ren.pncParR}</span>);
        }
        case "lam": {
          let bod = go(t.bod, stepPath(path, {case: "lam"}));
          let cls = `term lam ${selected}`;
          return (<span className={cls}>{top ? "" : ren.pncParL}{ren.pncLam} {ren.renderId(t.id, true)} {ren.pncDot} {bod}{top ? "" : ren.pncParR}</span>);
        }
        case "let": {
          let dom = go(t.dom, stepPath(path, {case: "let", subcase: "dom"}));
          let arg = go(t.arg, stepPath(path, {case: "let", subcase: "arg"}));
          let bod = go(t.bod, stepPath(path, {case: "let", subcase: "bod"}));
          let cls = `term let ${selected}`;
          return (<span className={cls}>{top ? "" : ren.pncParL}{ren.pncLet} {ren.renderId(t.id, true)} {ren.pncCol} {dom} {ren.pncEq} {arg} {ren.pncIn} {bod}{top ? "" : ren.pncParR}</span>);
        }
        case "app": return (<span>{top ? "" : ren.pncParL}{goNeu(t, path)}{top ? "" : ren.pncParR}</span>);
        case "var": return goNeu(t, path);
        case "hol": return (<span className="term hole">{ren.renderHole(path)}</span>);
      }
    }
    function goNeu(t: SynNeu, path: Path): JSX.Element {
      let selected: string = ren.mode === "interactive" && ren.app.state.path !== undefined && eqPath(path, ren.app.state.path) ? "selected" : "";
      switch (t.case) {
        case "app": {
          let app = go(t.app, stepPath(path, {case: "app", subcase: "app"}));
          let arg = go(t.arg, stepPath(path, {case: "app", subcase: "arg"}));
          let cls = `term app ${selected}`;
          return (<span className={cls}>{app} {arg}</span>);
        }
        case "var": {
          let cls = `term var ${selected}`;
          return (<span className={cls}>{ren.renderId(t.id)}</span>);
        }
      }
    }
    return go(t, path, true);
  }

  renderLevel(lvl: Level): JSX.Element
    {return lvl === "omega" ? (<span>ω</span>) : (<span>{lvl}</span>)}

  renderId(id: Id, editable: boolean = false): JSX.Element {
    let ren = this;
    if (editable && this.mode !== "view") {
      let onChange: ChangeEventHandler<HTMLInputElement> = event => {
        let elem = event.target;
        ren.app.update(update(ren.app.state, {case: "rename", id, lbl: elem.value}));
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

  renderHole(path: Path): JSX.Element {
    let s = `?`;
    switch (this.mode) {
      case "interactive": {
        if (this.app.state.path !== undefined && eqPath(path, this.app.state.path)) {
          return (<span className="holeId focussed">{s}</span>)
        } else {
          // transition: select this hole
          let onClick: MouseEventHandler = event => {
            this.app.update(update(this.app.state, {case: "select", path}));
          }
          return (<span className="holeId unfocussed" onClick={onClick}>{s}</span>)
        }
      }
      case "view": {
        return (<span className="holeId">{s}</span>)
      }
    }
  }
}