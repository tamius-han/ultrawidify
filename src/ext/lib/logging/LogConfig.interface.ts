

export default interface LogConfig {
  outputs: {
    console: boolean,
    buffer: boolean,
  },
  components: {
    settings?: boolean,
    aard?: boolean,
    videoData?: boolean,
    resizer?: boolean,
    comms?: boolean,
  },
  environments: {
    page: boolean,
    popup: boolean,
    ui: boolean,
    uwServer: boolean,
  }
}
