import { test, expect } from 'bun:test'
import { classifyKind } from './kinds.ts'

test('kind classification', () => {
  expect(classifyKind(1)).toBe('regular')
  expect(classifyKind(5)).toBe('regular')
  expect(classifyKind(6)).toBe('regular')
  expect(classifyKind(7)).toBe('regular')
  expect(classifyKind(1000)).toBe('regular')
  expect(classifyKind(9999)).toBe('regular')
  expect(classifyKind(0)).toBe('replaceable')
  expect(classifyKind(3)).toBe('replaceable')
  expect(classifyKind(10000)).toBe('replaceable')
  expect(classifyKind(19999)).toBe('replaceable')
  expect(classifyKind(20000)).toBe('ephemeral')
  expect(classifyKind(29999)).toBe('ephemeral')
  expect(classifyKind(30000)).toBe('parameterized')
  expect(classifyKind(39999)).toBe('parameterized')
  expect(classifyKind(40000)).toBe('unknown')
  expect(classifyKind(255)).toBe('unknown')
})
