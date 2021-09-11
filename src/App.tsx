import React, { MouseEventHandler } from 'react';
import { KeyboardEventHandler } from 'react';
import './App.css';
import { len, map, nil, rev } from './data/PList';
import { pushState } from './language/History';
import { Path } from './language/Path';
import { HoleShape, mold } from './language/Molding';
import { evaluate, reifyTyp } from './language/Normalization';
import { genPalette } from './language/Palette';
import { Renderer } from './language/Renderer';
import { SemTyp } from './language/Semantics';
import { hole, showSyn, Syn } from './language/Syntax';
import { Props } from './Props';
import { regenPalette, State, update } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {
    sig: hole(),
    imp: hole(),
    bufs: [],
    path: {top: {case: "sig"}, steps: nil()},
    plt: {items: [], i: undefined}
  };

  constructor(props: Props) {
    super(props);
    let app = this;
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      // TODO: other useful keybindings e.g.
      // - selecting fill
      // - filtering fills (esp. variable names for neutral forms)
      // - digging
      // - TODO: other kinds of transitions

      console.log(event.key);

      if (event.key === "Enter" && app.state.plt.i !== undefined) {
        app.update(update(app.state, app.state.plt.items[app.state.plt.i]));
      } else
      // undo
      if (event.key === "z") {app.update(update(app.state, {case: "undo"}));} else
      // move selection: left
      if (event.key === "a") {app.update(update(app.state, {case: "move selection", dir: "left"}))} else
      if (event.key === "d") {app.update(update(app.state, {case: "move selection", dir: "right"}))} else
      if (event.key === "w") {app.update(update(app.state, {case: "move selection", dir: "up"}))} else
      if (event.key === "s") {app.update(update(app.state, {case: "move selection", dir: "down"}))} else
      if (event.key === " ") {
        if (app.state.path !== undefined && app.state.path.top.case === "buf") {
          // submit selected buffer
          app.update(update(app.state, {case: "submit buffer", i: app.state.path.top.i}));
        }
      } // else
      if (event.key === "ArrowUp") {app.update(update(app.state, {case: "move suggestion", dir: "up"}))} else
      if (event.key === "ArrowDown") {app.update(update(app.state, {case: "move suggestion", dir: "down"}))}
      if (event.key === "Escape") {
        if (document.activeElement !== undefined) {
          try { // may not be an HTMLElement
            (document.activeElement as unknown as HTMLElement).blur();
          } catch (error) {}
        }
      }
      
    }, true);

    // Some initial calculation in State
    regenPalette(this.state);
    if (this.state.plt.items.length > 0)
      this.state.plt.i = 0;

    // pushState(this.state); // TODO
  }

  update(state: State): void {this.setState(state)}

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
    let ren = new Renderer(this);
    let sig = ren.renderSig(this.state.sig);
    let imp = ren.renderImp(this.state.imp);
    let bufs = this.state.bufs.map((buf, i) => ren.renderBuf(buf, i));
    return (
      <div className="display">
        <div className="main">
          <div className="sig">{sig}</div>
          <div className="imp">{imp}</div>
        </div>
        <div className="Buffers">{bufs}</div>
      </div>
    );
  }

  renderPanel(): JSX.Element {
    if (this.state.path !== undefined) {
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
    if (this.state.path !== undefined) {
      let ren = new Renderer(this);
      ren.mode = "view";
      let path: Path = this.state.path;
      let shape: HoleShape = mold(this.state, path);
      let items: JSX.Element[] = [];
      map(
        item => {
          items.push(
            <div className="context-item">
              {item.id.lbl} : {ren.renderSyn(item.T, path)}
            </div>
          )
        },
        rev(shape.ctx)
      )
      if (items.length !== 0) {
        return (
          <div className="context">
            {items}
          </div>
        );
      } else {
        return (
          <div className="context">
            Ø
          </div>
        )
      }
    } else return (<div></div>)

  }

  renderGoal(): JSX.Element {
    if (this.state.path !== undefined) {
      let ren = new Renderer(this);
      ren.mode = "view";
      let shape: HoleShape = mold(this.state, this.state.path);
      return (
        <div className="goal">
          {ren.renderSyn(shape.T, this.state.path)}
        </div>
      )
    } else return (<div></div>)
  }

  renderPalette(): JSX.Element {
    if (this.state.path !== undefined) {
      let path: Path = this.state.path;
      let ren = new Renderer(this);
      let pltElems: JSX.Element[] = [];
      this.state.plt.items.forEach((item, i) => pltElems.push(ren.renderPaletteItem(item, path, i === this.state.plt.i)));
      return (
        <div className="palette">
          {pltElems}
        </div>
      );
    } else return (<div></div>)
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