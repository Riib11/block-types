#lang racket

;; Modified from my named-variables implementation.

;; Neutral forms
(struct varr (x) #:transparent)
(struct app (ne e) #:transparent)

;; Syntactic domain
(struct lam (e) #:transparent)
(struct neutral (ne) #:transparent)
(struct type (level) #:transparent)
(struct Pi (x A B) #:transparent)
(struct lett (x e T body) #:transparent) ;; let is a keyword so must use "lett"
; (struct hole () #:transparent)

;; Semantic domain (Types are stored as data, but functions are stored as functions)
(struct Stype (level) #:transparent)
(struct SPi (x A B) #:transparent) ;; A : GSem G1 Type, B : (ren : Ren G1 G2) -> Sem G2 (A ren) -> Sem G2 Type
(struct Sneutral (e) #:transparent)

;; GSem = ren -> Sem

;; SUBSITUTIONS and RENAMINGS:
;; Ren G1 G2 = Var G1 T -> Var G2 ?T

;; Sub G1 G2 = Var G1 T -> GSem G2 ?T

;; Ren G G
(define (id-ren x) x)

;; transRR : Ren G1 G2 -> Ren G2 G3 -> Ren G1 G3
(define (transRR ren1 ren2)
  (lambda (x) (ren2 (ren1 x))))

;; transSR : Sub G1 G2 -> Ren G2 G3 -> Sub G1 G3
(define (transSR sub ren)
  (lambda (x) (lambda (ren2) ((sub x) (transRR ren ren2)))))

;; append1sub : ∀{Γ₁ A Γ₂} → Sub Γ₁ Γ₂ → GSem Γ₂ A → Sub (Γ₁ , A) Γ₂
(define (append1sub sub g)
  (lambda (x) (if (= x 0)
                  g
                  (sub (- x 1)))))

;; The eval functions are correct under the assumption that the input is well typed

(define (evalNeImpl sub e)
  (match e
    [(varr index)
     ((sub index) id-ren)]
    [(app e1 e2)
     ((evalNeImpl sub e1) (lambda (ren) (evalImpl (transSR sub ren) e2)))]))

;; sub : Sub G1 G2
(define (evalImpl sub e) ; (Sub G1 G2) -> Syn G1 T -> Sem G2 ..T
  (match e
    [(lam e)
     (lambda (a) (evalImpl (append1sub sub a) e))]
    [(neutral e)
     (evalNeImpl sub e)]
    [(lett x e T body)
     (let ((GsemE
            (lambda (ren) (evalImpl (transSR sub ren) e))))
       (evalImpl (append1sub sub GsemE) body))]
    [(Pi x A B)
     (SPi x (lambda (ren) (evalImpl (transSR sub ren) A))
          (lambda (ren a)
            (evalImpl (append1sub (transSR sub ren) a) B)))]
    [(type level)
     (Stype level)]
    ))

(define (eval e) ;; Syn -> Sem
  (evalImpl (id-sub '()) e))

;; The reflect/reify functions are correct under assumption that input type and term are correct
;; (Well not yet, after I implement them)

;; (T : SemT G) -> Ne G T -> Sem G T
(define (reflect T e) ;; T : Sem,    e : Neutral form (syntactic domain)
  (match T
    [(Stype level) (Sneutral e)]
    [(SPi x A B)
     (lambda (a) (reflect (B id-ren a) (app e (reify (A id-ren) a))))]
    [(Sneutral T) (neutral e)]
    [any (raise "shouldn't get here")]))

;; weaken1Ren : Ren Γ (Γ , T)
(define (weaken1Ren x)
  (+ x 1))

; forget1ren : ∀{Γ1 Γ2 T} → Ren (Γ1 , T) Γ2 → Ren Γ1 Γ2
(define (forget1ren ren)
  (lambda (x) (ren (+ x 1))))

;; (T : SemT G) -> GSem G T -> Nf G T (syntactic domain)
(define (reify T e);; T : Sem,   e : GSem.
  (match T
    [(Stype level)
     (match (e id-ren)
       [(Stype level) (type level)]
       [(SPi x A B)
        (Pi x (reify (Stype level) A)
            (reify (Stype level)
                   ;; Following lines have type: GSemT (G , ..A)
                   (lambda (ren) ; ren : Ren (G , .. A) G'
                     (B (forget1ren ren)
                        ;; Next line has type: GSemT G' ..A
                        (lambda (ren2) (reflect (A (transRR (forget1ren ren) ren2)) (varr (ren2 0))))))))]
       [(Sneutral e) (neutral e)] ;; TODO: is this right?
       [any (raise any)])]
    [(SPi x A B) ;; e : GSem G (SPi x A B) = (ren : Ren G G') -> (GSem G' (.. ren A)) -> (Sem G' (.... B))
     (lam (reify (B weaken1Ren
                    (lambda (ren) (reflect (A (forget1ren ren)) (varr (ren 0)))))
                 ;; The following line has type GSemT (G , (A weaken1Ren)) ..B
                 (lambda (ren) ;; ren : Ren (G, (A...)) G',     following lines : SemT G' ...B
                   ((e (forget1ren ren))
                    ;; following lines : GSem G' (... ren A)
                    (lambda (ren2) ; ren2 : Ren G' G''
                      (reflect (A (transRR (forget1ren ren) ren2))
                               (varr (ren2 (ren 0)))))))))]
    [(Sneutral T) (e id-ren)]
    [any (raise "shouldn't get here2")]))

;; TODO: reify should output neutral somewhere!

;idSub : ∀{Γ} → Sub Γ Γ
(define (id-sub ctx) ;; ctx is list of GSemT's
  (lambda (x)
    (lambda (ren) (reflect ((list-ref ctx x) ren) (neutral (varr (ren x)))))))

;normalize : ∀{Γ T} → Exp Γ T → Nf Γ T
(define (normalize T e)
  (reify (eval T) (lambda (ren) (evalImpl (transSR (id-sub '()) ren) e))))

;; Some test cases.
;; for each example, try (normalize typen termn)

(define type1
  (Pi 'X (type 5) (type 5)))
(define term1
  (lam (lett 'X (neutral (varr 0)) (type 5) (neutral (varr 0)))))
;; Should give: (lam (neutral (varr 0)))

(define type2 (type 5))
(define term2
  (Pi 'P (Pi '_ (type 4) (type 4))
      (neutral (app (varr 0)
                    (type 3)))))
;; Should give: (Pi 'P (Pi '_ (type 4) (type 4)) (app (varr 0) (type 3))))

(define type3
  (Pi 'T (type 5)
      (Pi '_ (neutral (varr 0)) (neutral (varr 1)))))
(define term3
  (lam (lam (neutral (varr 0)))))

(define type4
  (Pi 'P (Pi '_ (type 5) (type 5))
      (Pi 'T (type 5)
          (Pi '_
              (neutral (app (varr 1) (neutral (varr 0))))
              (neutral (app (varr 2) (neutral (varr 1))))))))
(define term4
  (lam (lam (lam (neutral (varr 0))))))

(define type5
  (Pi 'T (type 5)
      (Pi '_ (neutral (varr 0))
          (Pi '_ (neutral (varr 1))
              (neutral (varr 2))))))
(define term5
  (lam (lam (lam (neutral (varr 1))))))

