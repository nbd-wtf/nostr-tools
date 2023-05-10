import {utils, type Event} from '.'
import {buildEvent} from './test-helpers'

const {insertEventIntoAscendingList, insertEventIntoDescendingList} = utils

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
