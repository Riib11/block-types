# Block Types

TODO: decide on name

## TODO

- [ ] Holes are just (unique) free variables (but cannot be part of context for
      `evaluate` unfortunately, because we need to be able to substitute holes
      syntactically without normalizing)
- [ ] buffers' types are _just_ displayed, are not new syntactical objects
- [ ] buffers have a parent hole index _or_ their own context
- [ ] combine terms and their types in view i.e.
      `(λ x . b(x)) : (Π x : A . B(x))` ~~> `λ (x : A) . (b(x) : B(x))`.

## Overview

This project aims to formalize and implement an interactive programming
environment based on typed holes.

The _base language_ is a variant of the dependently typed λ-calculus with
explicitly indexed universes:

```
<term>  ::= U_<level>                              // universe type
          | Π <name> : <term> . <term>             // Π-type
          | <var> <term*>                          // application
          | let <name> : <term> = <term> in <term> // let-term
          | ?                                      // hole

<var>   ::= <natural-number>                       // DeBruijn index
<level> ::= <natural-number>                       // universe level
```

Notes:

- A λ-term does not need a variable name binding because we are using
  DeBruijn-indexed variables. However, its nice for the view to display
  user-chosen variable names. To facilitate this, the binding of a variable by a
  Π-type is annotated with a variable name, and `<var>` references to that
  variable will be substituted in the view with that variable name. A λ-term
  does not need to be annotated with a variable name since the name must be
  immediately queriable from its type since the type must contain a
  corresponding Π-type which has the variable name annotation
- A λ-term does not need a domain annotation because it cannot appear on the
  left end of an application. The only way for a λ-term to be used (by
  reference) on the left end of an application is via a let-term, which must
  have a domain annotation.
- Due to the required eta-abstraction, λ-terms are actually redundant in our
  syntax. Since a term's type is always immediately queriable, all information
  about the presence of λ-terms and their bound variable names are contained in
  their type's Π-types

TODO:

- How to do termination-checking? Perhaps that is an annoying detail to leave
  till later? Since there are probably many different ways to go about this
- In order to cleanly handle non-dependent function types without introducing
  new syntax, need the dependence-graphing algorithm to be able to decide if a Π
  introduces a dependency or not
- Wouldn't it be nice to support names? at least for the view? maybe names can
  be a part of a term's metadata rather than syntax structure, and then the view
  shows the names rather than the De Bruijn indices which are derived from a
  simple query on the λ/let-term's metadata. Then there is an issue of possible
  namespace clashes that appear in the view but are implictly resolved by the
  DeBruijn indices, here is a possible solution: [Namespaced De Bruijn
  Indices][namespaced de bruijn indices].
- How to handle inputting universe levels? For now we should choose something
  simple and general as a placeholder that we can decide on later, but here are
  the options for going forward after that:
  - Have explicit manipulation of levels, or perhaps levels are just a basic
    thing that can be input as opposed to another term that has type Level or
    something (so, there can't be level holes).
  - Agda-style: levels can be quantified over using a primitive type `Level`
  - TODO: other ways?
- How to allow inductive data types?
  - Self types
  - Automatic translation to heirarchy of Church encodings
  - TODO: Aaron Stump's other ways to derive induction data types

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

TODO:

- cut-copy-pasting blocks
- manipulating contexts of Buffer blocks
  - if a hole is filled in such a way that specifies the type of the filled
    argument, then when that argument is dug then its type will still be
    instantiated with any specifications that were achieved from the context.
    - Example: TODO

## References

- [Namespaced DeBruijn Indices][namespaced debruijn indices]

[namespaced debruijn indices]:
  https://www.haskellforall.com/2021/08/namespaced-de-bruijn-indices.html
