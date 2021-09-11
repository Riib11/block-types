import React, { MouseEventHandler } from 'react';
import { KeyboardEventHandler } from 'react';
import './App.css';
import { len, map, rev } from './data/PList';
import { HolePath } from './language/HolePath';
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
    sig: hole(),
    imp: hole(),
    bufs: [],
    path: undefined,
    trans: undefined
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

      if (evt.key === "Enter" && app.state.trans !== undefined) {
        update(app.state, app.state.trans);
        app.update();
      }

    }, true);
  }

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
      let ren = new Renderer(this, "panel");
      let path: HolePath = this.state.path;
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
      let ren = new Renderer(this, "panel");
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
      let ix: HolePath = this.state.path;
      let app = this;
      let ren = new Renderer(this, "panel");
      let shape: HoleShape = mold(this.state, this.state.path);
      let plt = genPalette(shape);
      let pltElems: JSX.Element[] = [];
      plt.forEach(item => {
        switch (item.case) {
          case "fill": {
            let onClick: MouseEventHandler = event => {
              update(this.state, {case: "fill", t: item.t});
              app.update()
            }
            pltElems.push(
              <div className="palette-item" onClick={onClick}>
                {ren.renderSyn(item.t, ix)}
              </div>
            );
            break;
          }
          case "buf": {
            let onClick: MouseEventHandler = event => {
              update(this.state, {
                case: "new Buffer",
                buf: item.buf
              });
              app.update()
            }
            pltElems.push(
              <div className="palette-item" onClick={onClick}>
                {ren.renderSyn(item.buf.t, ix)}
              </div>
            );
            break;
          }
        }


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