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
      // TODO: other useful keybindings e.g.
      // - selecting fill
      // - filtering fills (esp. variable names for neutral forms)
      // - digging
      // - TODO: other kinds of transitions

      // hole navigation
      if (app.state.id !== undefined) {
        // select hole to the left or right
        if (["ArrowLeft", "ArrowRight"].includes(evt.key)) {
          let holeIds = getHoleIds(app.state.p);
          // ix !== -1 because app.state.id !== undefined
          let ix = holeIds.indexOf(app.state.id); 
          ix = (holeIds.length + (evt.key === "ArrowLeft" ? ix - 1 : ix + 1)) % holeIds.length;
          let state = update(app.state, {case: "select", id: holeIds[ix]});
          app.setState(state);
        } else
        if (["u", "p", "l", "="].includes(evt.key)) {
          let term: Term | undefined;
          switch (evt.key) {
            case "u": term = {case: "uni", lvl: 0}; break;
            case "p": term = {case: "pi", id: {lbl: "x"}, dom: freshHole(), bod: freshHole()}; break;
            case "l": term = {case: "lam", bod: freshHole()}; break;
            case "n": term = {case: "neu", neu: {case: "app", app: {case: "var", var: 0}, arg: freshHole()}}; break;
            case "=": term = {case: "let", id: {lbl: "x"}, dom: freshHole(), arg: freshHole(), bod: freshHole()}; break;
            default: break;
          }
          if (term !== undefined)
            app.setState(update(app.state, {case: "fill", id: app.state.id, term}));
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
    if (this.state.id !== undefined) {
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
    return (
      <div className="palette">
        {this.renderPaletteItemFill("u", {case: "uni", lvl: 0})}
        {this.renderPaletteItemFill("p", {case: "pi", id: {lbl: "x"}, dom: freshHole(), bod: freshHole()})}
        {this.renderPaletteItemFill("l", {case: "lam", bod: freshHole()})}
        {this.renderPaletteItemFill("n", {case: "neu", neu: {case: "app", app: {case: "var", var: 0}, arg: freshHole()}})}
        {this.renderPaletteItemFill("=", {case: "let", id: {lbl: "x"}, dom: freshHole(), arg: freshHole(), bod: freshHole()})}
      </div>
    );
  }

  renderPaletteItemFill(k: string, t: Term): JSX.Element {
    let app = this;
    let r = new Renderer(this, "palette");
    let onClick: MouseEventHandler = event => {
      let state = update(this.state, {case: "fill", id: app.state.id as HoleId, term: t});
      app.setState(state);
    }
    return (
      <div className="palette-item" onClick={onClick}>
        {k}: {r.renderTerm(t)}
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

  renderConsole(): JSX.Element {
    return (
      <div className="console">
        console
      </div>
    )
  }
}