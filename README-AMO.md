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

## Reproducing build

Run the following commands to install dependencies and compile the firefox build:

```
npm ci
npm run build
```

The compiled code pops up in `/dist-ff`.
