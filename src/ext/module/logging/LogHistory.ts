export interface LogMessageOrigin {
  component: string,
  environment: string,
}

export interface LogMessage {
  time: Date;
  message: any,
  origin: LogMessageOrigin
}
