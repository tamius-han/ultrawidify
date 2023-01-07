export async function sleep(timeout) {
  return new Promise<void>( (resolve, reject) => setTimeout(() => resolve(), timeout));
}

/**
 * Creates deep copy of an object
 * @param obj
 * @returns
 */
export function _cp(obj) {
  return JSON.parse(JSON.stringify(obj));
}
