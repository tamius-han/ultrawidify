# Implementation details

## Enabling/disabling aspect ratio corrections

* Aspect ratios are changed by proxy. Extension attaches **a custom CSS class** to `video` and `player` elements.
* To prevent extension from affecting the appearance of a webpage, **it's sufficient to remove our custom CSS classes from `video` and `player` elements.** 
