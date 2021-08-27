export function intercalate<A>(as: A[], sep: A): A[] {
  let asNew: A[] = [];
  for (let i = 0; i < as.length; i++) {
    if (i > 0) asNew.push(sep);
    asNew.push(as[i]);
  }
  return asNew;
}