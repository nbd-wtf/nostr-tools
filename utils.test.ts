import {buildEvent} from './test-helpers.ts'
import {
  MessageQueue,
  insertEventIntoAscendingList,
  insertEventIntoDescendingList,
} from './utils.ts'

import type {Event} from './event.ts'

describe('inserting into a desc sorted list of events', () => {
  test('insert into an empty list', async () => {
    const list0: Event[] = []
    expect(
      insertEventIntoDescendingList(list0, buildEvent({id: 'abc', created_at: 10}))
    ).toHaveLength(1)
  })

  test('insert in the beginning of a list', async () => {
    const list0 = [buildEvent({created_at: 20}), buildEvent({created_at: 10})]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 30
    }))
    expect(list1).toHaveLength(3)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the beginning of a list with same created_at', async () => {
    const list0 = [
      buildEvent({created_at: 30}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 10}),
    ]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 30
    }))
    expect(list1).toHaveLength(4)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the middle of a list', async () => {
    const list0 = [
      buildEvent({created_at: 30}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 10}),
      buildEvent({created_at: 1}),
    ]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 15
    }))
    expect(list1).toHaveLength(5)
    expect(list1[2].id).toBe('abc')
  })

  test('insert in the end of a list', async () => {
    const list0 = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 10}),
    ]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 5
    }))
    expect(list1).toHaveLength(6)
    expect(list1.slice(-1)[0].id).toBe('abc')
  })

  test('insert in the last-to-end of a list with same created_at', async () => {
    const list0: Event[] = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 10}),
    ]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 10
    }))
    expect(list1).toHaveLength(6)
    expect(list1.slice(-2)[0].id).toBe('abc')
  })

  test('do not insert duplicates', async () => {
    const list0 = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 10, id: 'abc'}),
    ]
    const list1 = insertEventIntoDescendingList(list0, buildEvent({
      id: 'abc',
      created_at: 10
    }))
    expect(list1).toHaveLength(3)
  })
})

describe('inserting into a asc sorted list of events', () => {
  test('insert into an empty list', async () => {
    const list0: Event[] = []
    expect(
      insertEventIntoAscendingList(list0, buildEvent({id: 'abc', created_at: 10}))
    ).toHaveLength(1)
  })

  test('insert in the beginning of a list', async () => {
    const list0 = [buildEvent({created_at: 10}), buildEvent({created_at: 20})]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 1
    }))
    expect(list1).toHaveLength(3)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the beginning of a list with same created_at', async () => {
    const list0 = [
      buildEvent({created_at: 10}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 30}),
    ]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 10
    }))
    expect(list1).toHaveLength(4)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the middle of a list', async () => {
    const list0 = [
      buildEvent({created_at: 10}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 30}),
      buildEvent({created_at: 40}),
    ]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 25
    }))
    expect(list1).toHaveLength(5)
    expect(list1[2].id).toBe('abc')
  })

  test('insert in the end of a list', async () => {
    const list0 = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 40}),
    ]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 50
    }))
    expect(list1).toHaveLength(6)
    expect(list1.slice(-1)[0].id).toBe('abc')
  })

  test('insert in the last-to-end of a list with same created_at', async () => {
    const list0 = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 30}),
    ]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 30
    }))
    expect(list1).toHaveLength(6)
    expect(list1.slice(-2)[0].id).toBe('abc')
  })

  test('do not insert duplicates', async () => {
    const list0 = [
      buildEvent({created_at: 20}),
      buildEvent({created_at: 20}),
      buildEvent({created_at: 30, id: 'abc'}),
    ]
    const list1 = insertEventIntoAscendingList(list0, buildEvent({
      id: 'abc',
      created_at: 30
    }))
    expect(list1).toHaveLength(3)
  })
})

describe('enque a message into MessageQueue', () => {
  test('enque into an empty queue', () => {
    const queue = new MessageQueue()
    queue.enqueue('node1')
    expect(queue.first!.value).toBe('node1')
  })
  test('enque into a non-empty queue', () => {
    const queue = new MessageQueue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    queue.enqueue('node2')
    expect(queue.first!.value).toBe('node1')
    expect(queue.last!.value).toBe('node2')
    expect(queue.size).toBe(3)
  })
  test('dequeue from an empty queue', () => {
    const queue = new MessageQueue()
    const item1 = queue.dequeue()
    expect(item1).toBe(null)
    expect(queue.size).toBe(0)
  })
  test('dequeue from a non-empty queue', () => {
    const queue = new MessageQueue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    queue.enqueue('node2')
    const item1 = queue.dequeue()
    expect(item1).toBe('node1')
    const item2 = queue.dequeue()
    expect(item2).toBe('node3')
  })
  test('dequeue more than in queue', () => {
    const queue = new MessageQueue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    const item1 = queue.dequeue()
    expect(item1).toBe('node1')
    const item2 = queue.dequeue()
    expect(item2).toBe('node3')
    expect(queue.size).toBe(0)
    const item3 = queue.dequeue()
    expect(item3).toBe(null)
  })
})
