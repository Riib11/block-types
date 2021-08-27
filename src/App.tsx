import React, { MouseEventHandler } from 'react';
import { KeyboardEventHandler } from 'react';
import './App.css';
import { Renderer } from './language/Renderer';
import { emptyData, freshHole, getHoleIds, HoleId, Term } from './language/Syntax';
import { Props } from './Props';
import { State, update } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {
    p: {case: "jud", term: freshHole(), type: freshHole()},
    id: undefined
  };

  constructor(props: Props) {
    super(props);
    let app = this;
    document.addEventListener("keydown", (evt: KeyboardEvent) => {
      if (app.state.id !== undefined) {
        // select hole to the left or right
        if (["ArrowLeft", "ArrowRight"].includes(evt.key)) {
          let holeIds = getHoleIds(app.state.p);
          // ix !== -1 because app.state.id !== undefined
          let ix = holeIds.indexOf(app.state.id); 
          ix = (holeIds.length + (evt.key === "ArrowLeft" ? ix - 1 : ix + 1)) % holeIds.length;
          let state = update(app.state, {case: "select", id: holeIds[ix]});
          app.setState(state);
        }
      } else {
        // select first or last hole
        if (["ArrowLeft", "ArrowRight"].includes(evt.key)) {
          let holeIds = getHoleIds(app.state.p);
          let ix = evt.key === "ArrowLeft" ? 0 : holeIds.length - 1;
          let state = update(app.state, {case: "select", id: holeIds[ix]});
          app.setState(state);
        }
      }
    }, true);
  }

  render(): JSX.Element {
    return (
      <div className="App">
        {this.renderDisplay()}
        {this.renderPanel()}
      </div>
    );
  }

  renderDisplay(): JSX.Element {
    let r = new Renderer(this, "display");
    return (
      <div className="display">
        {r.renderPrgm(this.state.p)}
      </div>
    );
  }

  renderPanel(): JSX.Element {
    return (
      <div className="panel">
        {this.renderEnvironment()}
        {this.renderPalette()}
      </div>
    )
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
    return (
      <div className="context">
        context
      </div>
    );
  }

  renderGoal(): JSX.Element {
    return (
      <div className="goal">
        goal
      </div>
    );
  }

  renderPalette(): JSX.Element {
    if (this.state.id !== undefined) {
      return (
        <div className="palette">
          {this.renderPaletteItemFill({case: "uni", lvl: 0})}
          {this.renderPaletteItemFill({case: "pi", id: "x", dom: freshHole(), bod: freshHole()})}
          {this.renderPaletteItemFill({case: "lam", bod: freshHole()})}
          {/* {this.renderPaletteItemFill({case: "app", app: 0, args: [freshHole(), freshHole()]})} */}
          {this.renderPaletteItemFill({case: "neu", neu: {case: "app", app: {case: "var", var: 0}, arg: freshHole()}})}
          {this.renderPaletteItemFill({case: "let", id: "x", dom: freshHole(), arg: freshHole(), bod: freshHole()})}
        </div>
      );
    } else {
      // don't render pallete when there isn't a focussed hole
      return (<div></div>)
    }
  }

  renderPaletteItemFill(t: Term): JSX.Element {
    let app = this;
    let r = new Renderer(this, "palette");
    let onClick: MouseEventHandler = event => {
      let state = update(this.state, {case: "fill", id: app.state.id as HoleId, term: t});
      app.setState(state);
    }
    return (
      <div className="palette-item" onClick={onClick}>
        {r.renderTerm(t)}
      </div>
    )
  }

  renderPaletteItemDig(): JSX.Element {
    return (
      <div className="palette-item">
        dig
      </div>
    )
  }
}