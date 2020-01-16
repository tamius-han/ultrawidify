#Permissions

This extension requires some permissions. Here's why. 

#TL;DR version:

* **All tabs** — allows this extension to work on any site (By default, you need to enable sites other than those supported by default manually). Automatic detection on Netflix also [requires this permission](https://discourse.mozilla.org/t/drawwindow-in-webextension/13811) (or at least it did as of January 2018).
* **Access browser tabs** — required for the popup to work (and it still doesn't always).
* **Access browser activity during navigation** — makes some stuff with displaying popup easier. Most notably, it's used to ask the tab you're switching to whether it contains any videos, so this information is known before you need to open the popup.

#Technical mumbo-jumbo

todo

#This extension asks for permission that isn't listed above.

Sometimes (and by 'sometimes' I mean 'way too often') I forget to update README files. If there's a permission that I haven't wrote an explanation for, please [open an issue](https://github.com/tamius-han/ultrawidify/issues).