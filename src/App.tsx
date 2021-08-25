import React from 'react';
import './App.css';
import { emptyData, freshHoleId } from './language/Syntax';
import { Props } from './Props';
import { State } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {
    term: {case: "hole", id: freshHoleId(), data: emptyData()}
  };

  render(): JSX.Element {
    // TODO
    return (<div></div>);
  }
}