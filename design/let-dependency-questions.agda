open import Data.Bool
open import Data.Nat
open import Data.String

{-

On the surface, it seems that
let x = e₁ in e₂
and
(λ x . e₂) e₁
Are the same! However, they behave differently when types depend on terms.
For example:
-}

P : Bool → Set
P true = ℕ
P false = String

f : (b : Bool) → P b
f true = 10
f false = "one hundred"

withLet : String
withLet = let b = false in (f b) ++ " thousand"

-- withLet works, but withLamApp DOESNT TYPECHECK!
-- This is because inside lambda, doesn't know that
-- (f b) has type string, only that is has type (P b)

-- withLamApp : String
-- withLamApp = (λ (b : Bool) → (f b) ++ " thousand") false
-- In our language if let doesn't allow term dependency, withLet would have same problem.

-- On the other hand, this DOES typecheck:
withLamApp2 : String
withLamApp2 = ((λ (b : Bool) → (f b)) false) ++ " thousand"
-- Which would be written in our langauge as:
--            let s = (let b = false in (f b)) in s ++ " thousand"

{-

Why is this important? Well one example is a fairly common pattern where you have
something like:

-}

-- Some function which generates a type in some way:
GenType : ℕ → Set
GenType zero = Bool
GenType (suc n) = Bool → (GenType n)

g : GenType 3
g = λ b₁ b₂ b₃ → b₁

-- We need to bound variable GenType to actually be evaluated, so we can write
-- the definition of f.

-- QUESTION: is the above definitions Gentype and g possible to write in our
-- language at all currently?
-- For example, the following doesn't work (using ((λ x . e) e) to simulate our lets)

{-
example : Bool
example = (λ (GenType : ℕ → Set)
             (g : GenType 3) → g true false false)
          -- Definition of GenType
          GenType -- just put this here because I'm lazy, but should be full definition written again
          -- Definition of g
          g
-}

-- If there is no working way to do that example in our language, we need to
-- rethink having lets depend on value, or other solutions.
-- Is there a value to having lets which DON'T depend on value?
