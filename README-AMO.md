# Build guide for AMO

## Build platform

The extension is built on a PC running Manjaro Linux. npm and node are installed from repositories/aur.

### Software versions:

Node/npm versions:

```
node: %%NODE_VERSION%%
npm:  %%NPM_VERSION%%
```

Linux (`uname -a`):

```
%%LINUX_VERSION%%
```


## Installing dependencies

Run `npm ci`


## Reproducing build

`npm run build`

The compiled code pops up in `/dist-ff` (`/dist-chrome` for Chromium-based browsers).
