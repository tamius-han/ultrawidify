export type ProcessedElementStyles = {
  [x: string]: {
    css: string,
    pxValue: number
  }
};

/**
 * Note that this function is written _very_ dangerously
 * and includes absolutely no error handling
 */
function getPixelValue(value: string, element?: HTMLElement, prop?: string) {
  if (value === undefined || value === null) {
    return null;
  }

  if (value.endsWith('px')) {
    // console.log('value ends in px:', value)
    return parseFloat(value);
  }
  if (value.endsWith('%')) {
    // console.log('value ends in %:', value)
    // This allegedly doesn't work for certain types of properties, allegedly.
    const parent = element?.parentElement;
    if (parent && prop) {
      const parentDimensions = parent.getBoundingClientRect();
      return (parseFloat(value) * 0.01) * (prop.includes('height') || ['top', 'bottom'].includes(prop) ? parentDimensions.height : parentDimensions.width);
    } else {
      return null;
    }
  }

  if (value.endsWith("vw")) {
    const viewportWidth = window.innerWidth;
    return (parseFloat(value) / 100) * viewportWidth;
  }
  if (value.endsWith("vh")) {
    const viewportHeight = window.innerHeight;
    return (parseFloat(value) / 100) * viewportHeight;
  }

  if (value.endsWith("rem")) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return rootFontSize * parseFloat(value);
  }
  if (value.endsWith("em")) {
    const fontSize = parseFloat(getComputedStyle(element).fontSize);
    return fontSize * parseFloat(value);
  }
};

export default function getElementStyles(element: HTMLElement, props: string[]): ProcessedElementStyles {
  const stylesheets = document.styleSheets;
  const computedStyles = getComputedStyle(element);
  const stylesOut = {};

  for (const stylesheet of stylesheets) {
    // console.log('——————————————— processing stylesheet:', stylesheet);
    try {
      for (const rule of stylesheet?.cssRules) {
        if (rule instanceof CSSStyleRule) {
          if (element.matches(rule.selectorText)) {
            // console.log('element matches rule:', rule);

            for (const property in rule.style) {
              if (!props.includes(property)) {
                continue;
              }

              const cssValue = rule.style.getPropertyValue(property);
              const actualValue = computedStyles.getPropertyValue(property);

              const theory = getPixelValue(cssValue, element, property);
              const practice = getPixelValue(actualValue, element, property);

              if (theory === practice) {
                stylesOut[property] = {
                  css: cssValue,
                  pxValue: theory
                }
              }
            }
          }
        }
      }

    } catch (e) {
      // Cross-origin styles amy cause problems
    }
  }

  return stylesOut;
}





