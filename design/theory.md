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
f : Π U0 . Π 1 . 1
a : U0
```

Then we are not allowed to simply write the application

```
f a : Π a . a
```

since `f` expects two arguments. So, to achieve a term of the same type, we must
write

```
λ f a 0 : Π a . a
```

TODO: Something about how this allows for better normal forms for something? I
forget

## β-Normal Forms

Is is disallowed to have a lambda on the left end of an application; only
variables can be on the left end of an application. This is because TODO: give
example of the annoyances that arise when there are lambdas on the left-hand
side of an application, having to do with unique normal forms.

The valid way of achieving the same effect of having a lambda on the left end of
an application is to use a let-term. Let-terms solve the above issue by
requiring the argument of the lambda to be explicitly type-annotated.
