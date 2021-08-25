# Theory

## Unificationless

Since a term is built up incrementally such that

- it is always well-typed
- type annotations are required when a lambda is on the left of an application
  (a neutral term, covered by the let-term case)

it should be possible to use a direct type checking algorithm rather than an
indirect and annoying constraint-solving unification algorithm.

TODO: how to do this exactly?

## η-Normal Forms

It is disallowed to have a variable without applying it to all of its required
arguments (which may be count 0 if it is constant). Note that in particular this
disallows currying.

For example, suppose we have the terms

```
id : Π (A : U0) . Π (x : A) . A
A  : U0
```

Then we are not allowed to simply write the application

```
id A :: Π (x : A) . A
```

since `id` expects two arguments. So, to achieve a term of the same type, we
must write

```
λ x . id A x :: Π (x : A) . A
```

TODO: mention complication where let-bound variables that are used as arguments
to dependent functions may not work with other arguments whose types depend on
the valud of the let-bound variable, but would work if that variable was
substituted with the value bound by the let.

## β-Normal Forms

Is is disallowed to have a lambda on the left end of an application; only
variables can be on the left end of an application. This is because TODO: give
example of the annoyances that arise when there are lambdas on the left-hand
side of an application, having to do with unique normal forms.

The valid way of achieving the same effect of having a lambda on the left end of
an application is to use a let-term. Let-terms solve the above issue by
requiring the argument of the lambda to be explicitly type-annotated.

## Dependency

A term `b` is _dependent_ on another term `a` if `a` appears in the type of `b`.
For example, if we have some terms

```
F : Π (x : U0) . U0
G : Π (x : U0) (y : U0) . U0
f : Π (x : U0) (y : F x) . G x y
```

and are considering the application

```
f a b :: G a b
```

then we see that `a: U0` and `b: F a`. Since `a` appears in the type of `b`
which is `F a`, `b` is dependent on `a`.

In general, dependencies are possible in the following situations:

- In an application `f a_1 ... a_n`, each argument `a_i` depends on `f` and all
  arguments `a_1` through `a_{i-1}`.
- In a let-term `let x : A = a in b`, the term `a` depends on its type `A`
- In a Π-type `Π x : A . B`, the type `B` depends on the type `A`.

These are all of this situations where a dependency is _possible_, but do not
necessarily imply a dependency. For example, if we following terms

```
A, B  : U0
a, b  :
const : Π (A : U0) (B : U0) (x : A) (y : B) . A
```

an consider the application

```
const A B a b :: A
```

the argument `b` is _not_ dependent on the argument `a`, as `a` does not appear
in the type of `b` which is just `B`. (Note that `b` _is_ still dependent on the
argument `B` since `B does in fact appear in the type of `b`).

So, an algorithm is needed that computes the dependency graph between subterms
of a given term, by considering all the cases of possible dependency and then
filtering out the ones that are shown to certainly not be dependencies. If a
dependency decision must take a hole into account, then that it is
possible-but-unknown that there is a dependency there and so it is considered a
dependency in order to disallow incorrectly deciding there is no dependency when
there may end up being one when the hole is filled.

In this way, dependency considerations are important for maintaining
well-typedness with holes. The rules that maintain this invariant are:

- a hole cannot be filled until all holes it depends on are filled
- a hole cannot be dug if there are terms that depend on it

TODO: formalize caveat that dependency on a hole is only a true dependency if
the hole is at the top of the dependended-upon term. For example, a hole with
type `Π (x : ?) ?` can be filled with `λ ?` even though the type has holes in
it, since those holes are not at the top and it is known that `λ ?` is a valid
fill no matter what the holes in the type are filled with.
