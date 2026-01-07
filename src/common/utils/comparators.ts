export function collectionHas(collection, element): boolean {
  for (let i = 0, len = collection.length; i < len; i++) {
    if (collection[i] == element) {
      return true;
    }
  }
  return false;
}

export function equalish(a: number,b: number, tolerance: number): boolean {
  return a > b - tolerance && a < b + tolerance;
}
