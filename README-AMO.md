# Build guide for AMO

## Build platform

The extension is built on a PC running Manjaro Linux. Yarn is the package manager of choice. 

Yarn version: 1.16.0
Node version: v11.15.0


## Installing dependencies

`yarn install --frozen-lockfile`

According to Yarn documentation, that should install the exact version of dependencies that the extension is using.

## Reproducing build

`npm run build`

The compiled code pops up in /dist. 