import { describe, expect, it } from 'bun:test'

import { ZapGoal } from './kinds.ts'
import { Goal, generateGoalEventTemplate, validateZapGoalEvent } from './nip75.ts'
import { finalizeEvent, generateSecretKey } from './pure.ts'

describe('Goal Type', () => {
  it('should create a proper Goal object', () => {
    const goal: Goal = {
      content: 'Fundraising for a new project',
      amount: '100000000',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
      closedAt: 1671150419,
      image: 'https://example.com/goal-image.jpg',
      summary: 'Help us reach our fundraising goal!',
      r: 'https://example.com/additional-info',
      a: 'fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146',
      zapTags: [
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }

    expect(goal.content).toBe('Fundraising for a new project')
    expect(goal.amount).toBe('100000000')
    expect(goal.relays).toEqual(['wss://relay1.example.com', 'wss://relay2.example.com'])
    expect(goal.closedAt).toBe(1671150419)
    expect(goal.image).toBe('https://example.com/goal-image.jpg')
    expect(goal.summary).toBe('Help us reach our fundraising goal!')
    expect(goal.r).toBe('https://example.com/additional-info')
    expect(goal.a).toBe('fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146')
    expect(goal.zapTags).toEqual([
      ['zap', 'beneficiary1'],
      ['zap', 'beneficiary2'],
    ])
  })
})

describe('generateGoalEventTemplate', () => {
  it('should generate an EventTemplate for a fundraising goal', () => {
    const goal: Goal = {
      content: 'Fundraising for a new project',
      amount: '100000000',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
      closedAt: 1671150419,
      image: 'https://example.com/goal-image.jpg',
      summary: 'Help us reach our fundraising goal!',
      r: 'https://example.com/additional-info',
      zapTags: [
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }

    const eventTemplate = generateGoalEventTemplate(goal)

    expect(eventTemplate.kind).toBe(ZapGoal)
    expect(eventTemplate.content).toBe('Fundraising for a new project')
    expect(eventTemplate.tags).toEqual([
      ['amount', '100000000'],
      ['relays', 'wss://relay1.example.com', 'wss://relay2.example.com'],
      ['closed_at', '1671150419'],
      ['image', 'https://example.com/goal-image.jpg'],
      ['summary', 'Help us reach our fundraising goal!'],
      ['r', 'https://example.com/additional-info'],
      ['zap', 'beneficiary1'],
      ['zap', 'beneficiary2'],
    ])
  })

  it('should generate an EventTemplate for a fundraising goal without optional properties', () => {
    const goal: Goal = {
      content: 'Fundraising for a new project',
      amount: '100000000',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
    }

    const eventTemplate = generateGoalEventTemplate(goal)

    expect(eventTemplate.kind).toBe(ZapGoal)
    expect(eventTemplate.content).toBe('Fundraising for a new project')
    expect(eventTemplate.tags).toEqual([
      ['amount', '100000000'],
      ['relays', 'wss://relay1.example.com', 'wss://relay2.example.com'],
    ])
  })

  it('should generate an EventTemplate that is valid', () => {
    const sk = generateSecretKey()
    const goal: Goal = {
      content: 'Fundraising for a new project',
      amount: '100000000',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
      closedAt: 1671150419,
      image: 'https://example.com/goal-image.jpg',
      summary: 'Help us reach our fundraising goal!',
      r: 'https://example.com/additional-info',
      zapTags: [
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }
    const eventTemplate = generateGoalEventTemplate(goal)
    const event = finalizeEvent(eventTemplate, sk)
    const isValid = validateZapGoalEvent(event)

    expect(isValid).toBe(true)
  })
})

describe('validateZapGoalEvent', () => {
  it('should validate a proper Goal event', () => {
    const sk = generateSecretKey()
    const eventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: ZapGoal,
      content: 'Fundraising for a new project',
      tags: [
        ['amount', '100000000'],
        ['relays', 'wss://relay1.example.com', 'wss://relay2.example.com'],
        ['closed_at', '1671150419'],
        ['image', 'https://example.com/goal-image.jpg'],
        ['summary', 'Help us reach our fundraising goal!'],
        ['r', 'https://example.com/additional-info'],
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }
    const event = finalizeEvent(eventTemplate, sk)
    const isValid = validateZapGoalEvent(event)

    expect(isValid).toBe(true)
  })

  it('should not validate an event with an incorrect kind', () => {
    const sk = generateSecretKey()
    const eventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 0, // Incorrect kind
      content: 'Fundraising for a new project',
      tags: [
        ['amount', '100000000'],
        ['relays', 'wss://relay1.example.com', 'wss://relay2.example.com'],
        ['closed_at', '1671150419'],
        ['image', 'https://example.com/goal-image.jpg'],
        ['summary', 'Help us reach our fundraising goal!'],
        ['r', 'https://example.com/additional-info'],
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }
    const event = finalizeEvent(eventTemplate, sk)
    const isValid = validateZapGoalEvent(event)

    expect(isValid).toBe(false)
  })

  it('should not validate an event with missing required "amount" tag', () => {
    const sk = generateSecretKey()
    const eventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: ZapGoal,
      content: 'Fundraising for a new project',
      tags: [
        // Missing "amount" tag
        ['relays', 'wss://relay1.example.com', 'wss://relay2.example.com'],
        ['closed_at', '1671150419'],
        ['image', 'https://example.com/goal-image.jpg'],
        ['summary', 'Help us reach our fundraising goal!'],
        ['r', 'https://example.com/additional-info'],
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }
    const event = finalizeEvent(eventTemplate, sk)
    const isValid = validateZapGoalEvent(event)

    expect(isValid).toBe(false)
  })

  it('should not validate an event with missing required "relays" tag', () => {
    const sk = generateSecretKey()
    const eventTemplate = {
      created_at: Math.floor(Date.now() / 1000),
      kind: ZapGoal,
      content: 'Fundraising for a new project',
      tags: [
        ['amount', '100000000'],
        // Missing "relays" tag
        ['closed_at', '1671150419'],
        ['image', 'https://example.com/goal-image.jpg'],
        ['summary', 'Help us reach our fundraising goal!'],
        ['r', 'https://example.com/additional-info'],
        ['zap', 'beneficiary1'],
        ['zap', 'beneficiary2'],
      ],
    }
    const event = finalizeEvent(eventTemplate, sk)
    const isValid = validateZapGoalEvent(event)

    expect(isValid).toBe(false)
  })
})
