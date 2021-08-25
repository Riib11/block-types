import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Props } from './Props';
import { State } from './State';

export default class App extends React.Component<Props, State> {
  state: State = {};

  render(): JSX.Element {
    // TODO
    return (<div></div>);
  }
}