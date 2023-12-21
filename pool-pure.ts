import { verifyEvent } from './pure.ts'
import TrustedSimplePool from './trusted-pool.ts'

export default class PureSimplePool extends TrustedSimplePool {
  constructor() {
    super({ verifyEvent })
  }
}

export * from './trusted-pool.ts'
