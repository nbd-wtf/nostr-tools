import { verifyEvent } from './pure.ts'
import { AbstractSimplePool } from './abstract-pool.ts'

export class SimplePool extends AbstractSimplePool {
  constructor() {
    super({ verifyEvent })
  }
}

export * from './abstract-pool.ts'
