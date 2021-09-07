import React, { MouseEventHandler } from 'react';
import { KeyboardEventHandler } from 'react';
import './App.css';
import { len, map } from './data/PList';
import { HoleCtx, HoleShape, mold } from './language/Molding';
import { evaluate, reifyTyp } from './language/Normalization';
import { genPalette } from './language/Palette';
import { Renderer } from './language/Renderer';
import { SemTyp } from './language/Semantics';
import { freshHole, getHoleIds, HoleId, showSyn, Syn } from './language/Syntax';
import { Props } from './Props';
import { Focus, State, update } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {
    p: {t: freshHole(), T: freshHole()},
    foc: undefined
  };

  constructor(props: Props) {
    super(props);
    let app = this;
    document.addEventListener("keydown", (evt: KeyboardEvent) => {
      // TODO: other useful keybindings e.g.
      // - selecting fill
      // - filtering fills (esp. variable names for neutral forms)
      // - digging
      // - TODO: other kinds of transitions

      // TODO: tmp disable because of buffer complications
      // // hole navigation
      // if (app.state.foc !== undefined) {
      //   // select hole to the left or right
      //   if (["ArrowLeft", "ArrowRight"].includes(evt.key)) {
      //     let holeIds = getHoleIds(app.state.p);
      //     // ix !== -1 because app.state.id !== undefined
      //     let ix = holeIds.indexOf(app.state.foc.id); 
      //     ix = (holeIds.length + (evt.key === "ArrowLeft" ? ix - 1 : ix + 1)) % holeIds.length;
      //     let state = update(app.state, {case: "select", id: holeIds[ix]});
      //     app.setState(state);
      //   } else
      //   if (["u", "p", "l", "="].includes(evt.key)) {
      //     let t: Syn | undefined;
      //     switch (evt.key) {
      //       case "u": t = {case: "uni", lvl: 0}; break;
      //       case "p": t = {case: "pie", id: {lbl: "x"}, dom: freshHole(), cod: freshHole()}; break;
      //       case "l": t = {case: "lam", id: {lbl: "x"}, bod: freshHole()}; break;
      //       case "n": t = {case: "app", app: {case: "var", id: {lbl: "x"}, dbl: 0}, arg: freshHole()}; break;
      //       case "=": t = {case: "let", id: {lbl: "x"}, dom: freshHole(), arg: freshHole(), bod: freshHole()}; break;
      //       default: break;
      //     }
      //     if (t !== undefined)
      //       app.setState(update(app.state, {case: "fill", t}));
      //   }
      // } else {
      //   // select first or last hole
      //   if (["ArrowLeft", "ArrowRight"].includes(evt.key)) {
      //     let holeIds = getHoleIds(app.state.p);
      //     let ix = evt.key === "ArrowLeft" ? 0 : holeIds.length - 1;
      //     let state = update(app.state, {case: "select", id: holeIds[ix]});
      //     app.setState(state);
      //   }
      // }
    }, true);
  }

  getFoc(): Focus | undefined {
    let foc: Focus | undefined = this.state.foc;
    while (foc !== undefined) {
      if (foc.buf !== undefined && foc.buf.foc !== undefined) {
        foc = foc.buf.foc;
      } else break;
    }
    return foc;
  }

  render(): JSX.Element {
    return (
      <div className="App">
        {this.renderDisplay()}
        {this.renderPanel()}
      </div>
    );
    // return (
    //   <div>
    //     {this.renderExample(example1)}
    //     {this.renderExample(example2)}
    //     {this.renderExample(example3)}
    //     {this.renderExample(example4)}
    //     {this.renderExample(example5)}
    //     {this.renderExample(example6)}
    //   </div>
    // );
  }

  // renderExample(example: Example) {
  //   return (
  //     <div>
  //       {showSyn(example.t)} ~&gt; {showSyn(example.result)} : {showSyn(example.type)}
  //     </div>
  //   )
  // }

  renderDisplay(): JSX.Element {
    let r = new Renderer(this, "display");

    let bufs: JSX.Element[] = [];
    let foc: Focus | undefined = this.state.foc;
    while (foc !== undefined) {
      if (foc.buf !== undefined) {
        bufs.push(
          <div className="buffer">
            {r.renderSyn(foc.buf.t)}
          </div>
        );
        if (foc.buf.foc !== undefined) {
          foc = foc.buf.foc;
        } else break;
      } else break;
    }
    if (bufs.length > 0) {
      return (
        <div className="display">
          <div className="program">
            {r.renderPrgm(this.state.p)}
          </div>
          <div className="buffers">
            {bufs}
          </div>
        </div>
      );
    } else {
      return (
        <div className="display">
          <div className="program">
            {r.renderPrgm(this.state.p)}
          </div>
        </div>
      );
    }
  }

  renderPanel(): JSX.Element {
    if (this.state.foc !== undefined) {
      return (
        <div className="panel">
          {this.renderEnvironment()}
          {this.renderPalette()}
          {this.renderConsole()}
        </div>
      );
    } else {
      return (
        <div className="panel">
          {this.renderConsole()}
        </div>
      );
    }
  }

  renderEnvironment(): JSX.Element {
    return (
      <div className="environment">
        {this.renderContext()}
        <hr/>
        {this.renderGoal()}
      </div>
    );
  }

  renderContext(): JSX.Element {
    let foc = this.getFoc();
    let ren = new Renderer(this, "display");
    if (foc !== undefined) {
      let items: JSX.Element[] = [];
      map(
        item => {
          items.push(
            <div className="context-item">
              {item.id.lbl} : {ren.renderSyn(reifyTyp(item.T, len((foc as Focus).ctx)))}
            </div>
          )
        },
        foc.ctx
      )
      return (
        <div className="context">
          {items}
        </div>
      );
    } else return (<div></div>)

  }

  renderGoal(): JSX.Element {
    let foc = this.getFoc();
    let ren = new Renderer(this, "display");
    if (foc !== undefined) {
      let T: Syn = reifyTyp(foc.T);
      console.log("foc.ctx:"); console.log(foc.ctx);
      return (
        <div className="goal">
          {ren.renderSyn(T)}
        </div>
      );
  } else return (<div></div>)
  }

  renderPalette(): JSX.Element {
    let foc = this.getFoc();
    if (foc !== undefined) {
      let shapes: Map<HoleId, HoleShape> = mold(evaluate(this.state.p.T) as SemTyp, evaluate(this.state.p.t));
      console.log("shapes:"); console.log(shapes);
      console.log("this.state.id:"); console.log(foc.id)
      let plt = genPalette(shapes.get(foc.id) as HoleShape);
      let pltElems: JSX.Element[] = [];
      plt.forEach(t => pltElems.push(this.renderPaletteItemFill(t)));
      return (
        <div className="palette">
          {pltElems}
        </div>
      );
    } else {
      return (<div></div>);
    }
  }

  renderPaletteItemFill(t: Syn): JSX.Element {
    let app = this;
    let r = new Renderer(this, "palette");
    let onClick: MouseEventHandler = event => {
      let state = update(this.state, {case: "fill", t: t});
      app.setState(state);
    }
    return (
      <div className="palette-item" onClick={onClick}>
        {r.renderSyn(t)}
      </div>
    );
  }

  renderPaletteItemDig(): JSX.Element {
    return (
      <div className="palette-item">
        dig
      </div>
    )
  }

  renderConsole(): JSX.Element {
    return (
      <div className="console">
        console
      </div>
    )
  }
}