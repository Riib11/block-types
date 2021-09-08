import React, { MouseEventHandler } from 'react';
import { KeyboardEventHandler } from 'react';
import './App.css';
import { len, map } from './data/PList';
import { ctxToIds } from './language/Ctx';
import { HoleIx } from './language/HoleIx';
import { HoleShape, mold } from './language/Molding';
import { evaluate, reifyTyp } from './language/Normalization';
import { genPalette } from './language/Palette';
import { Renderer } from './language/Renderer';
import { SemTyp } from './language/Semantics';
import { hole, showSyn, Syn } from './language/Syntax';
import { Props } from './Props';
import { State, update } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {
    sig: hole,
    imp: hole,
    pfbs: [],
    ix: undefined,
  };

  // constructor(props: Props) {
  //   super(props);
  //   let app = this;
  //   document.addEventListener("keydown", (evt: KeyboardEvent) => {
  //     // TODO: other useful keybindings e.g.
  //     // - selecting fill
  //     // - filtering fills (esp. variable names for neutral forms)
  //     // - digging
  //     // - TODO: other kinds of transitions
  //   }, true);
  // }

  update(): void {this.setState(this.state)}

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
    let ren = new Renderer(this, "display");
    let sig = ren.renderSig(this.state.sig);
    let imp = ren.renderImp(this.state.imp);
    let pfbs = this.state.pfbs.map((pfb, i) => ren.renderPfb(pfb, i));
    return (
      <div className="display">
        <div className="main">
          <div className="sig">{sig}</div>
          <div className="imp">{imp}</div>
        </div>
        <div className="prefabs">{pfbs}</div>
      </div>
    );
  }

  renderPanel(): JSX.Element {
    if (this.state.ix !== undefined) {
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
    if (this.state.ix !== undefined) {
      let ren = new Renderer(this, "display");
      let ix: HoleIx = this.state.ix;
      let shape: HoleShape = mold(this.state, this.state.ix);
      let items: JSX.Element[] = [];
      map(
        item => {
          items.push(
            <div className="context-item">
              {item.id.lbl} : {ren.renderSyn(item.T, ix, ctxToIds(shape.ctx))}
            </div>
          )
        },
        shape.ctx
      )
      return (
        <div className="context">
          {items}
        </div>
      );
    } else return (<div></div>)

  }

  renderGoal(): JSX.Element {
    if (this.state.ix !== undefined) {
      let ren = new Renderer(this, "display");
      let shape: HoleShape = mold(this.state, this.state.ix);
      return (
        <div className="goal">
          {ren.renderSyn(shape.T, this.state.ix, ctxToIds(shape.ctx))}
        </div>
      )
    } else return (<div></div>)
  }

  renderPalette(): JSX.Element {
    if (this.state.ix !== undefined) {
      let ix: HoleIx = this.state.ix;
      let app = this;
      let ren = new Renderer(this, "palette");
      let shape: HoleShape = mold(this.state, this.state.ix);
      let plt = genPalette(shape);
      let pltElems: JSX.Element[] = [];
      plt.forEach(t => {
        let onClick: MouseEventHandler = event => {
          update(this.state, {case: "fill", t});
          app.update()
        }
        return (
          <div className="palette-item" onClick={onClick}>
            {ren.renderSyn(t, ix, ctxToIds(shape.ctx))}
          </div>
        );
      });
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