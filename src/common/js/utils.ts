export async function sleep(timeout) {
  return new Promise<void>( (resolve, reject) => setTimeout(() => resolve(), timeout));
}

/**
 * Creates deep copy of an object
 * @param obj
 * @returns
 */
export function _cp(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    // console.error('Failed to parse json. This probably means that the data we received was not an object. Will return data as-is');
    // console.error('data in:', obj, 'error:', e);
    return obj;
  }
}
