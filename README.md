# Block Types

TODO: decide on name

## Overview

This project aims to formalize and implement an interactive programming
environment based on typed holes.

The _base language_ is a variant of the dependently typed lambda calculus with
explicitly indexed universes:

```
<term>      ::= Π(<arg-typed*>) <term>
              | λ(<arg*>) <term>
              | U_<level>
              | <var>
              | <var> <arg*>
              | let <arg>: <term> = <term> in <term>

<arg-typed> ::= <name>: <term>
<arg>       ::= <name>
<var>       ::= <name>
<level>     ::= <natural-number>
```

## Design Goals

- No unification
- Raw source code is rich with metadata such as: context, type, dependencies
  (graph)
- The only way of interacting with the source code is through a programming
  environment that allows a very limited set of basic capabilities (along with
  metaprogramming features for convenience) which maintain the invariant that
  the **program is always well-typed**

## Representing and Viewing Source Code

The interaction loop with the programming environment has three components:

1. The user's _input_ is encoded as a transition in a FSM model of the current
   state. The transition is chosen from a palette of valid options computed for
   each state as needed. The basic kinds of transitions are:
   - _Fill hole_. Fill the currently selected hole with the selected
     constructor. This will generate new holes in the new term as necessary.
   - _Dig hole_. Replace the selected term with a new hole. This is only a valid
     operation if no other parts of the program are _dependent_ on that term.
     TODO: how exactly to calculate dependencies? GOAL: always err towards
     safety, as to never allow an unsafe dig even if this prevents some safe
     digs.
   - _Select hole_. Focus the programming environment on a particular hole. This
     brings into view the hole's context and possible fills.
   - TODO: other transitions?
2. The _state_ updates according to the input transition. The state is the
   source code of the programming, which contains all the information necessary
   to immediately respond to queries about features of terms such as types,
   contexts, and TODO: what else is needed? The source code is extremely verbose
   and should never need to be inspected by the user, but is encoded purely
   textually in order to allow from cross-application copy-pasting and similar
   operations.
3. The _view_ is generated from the state in order to show the user a nice
   presentation of the important components of the source code without
   cluttering it with all the information contained in the source code's
   verbosity. Information can be queried about program terms by interacting with
   the GUI.

## Manipulating Source Code

TODO

- cut-copy-pasting blocks
- manipulating contexts of prefab blocks
  - if a hole is filled in such a way that specifies the type of the filled
    argument, then when that argument is dug then its type will still be
    instantiated with any specifications that were achieved from the context.
    - Example: TODO
