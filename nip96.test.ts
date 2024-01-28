import { describe, expect, it } from 'bun:test'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

import { FileServerPreference } from './kinds.ts'
import {
  calculateFileHash,
  checkFileProcessingStatus,
  deleteFile,
  generateDownloadUrl,
  generateFSPEventTemplate,
  readServerConfig,
  uploadFile,
  validateDelayedProcessingResponse,
  validateFileUploadResponse,
  validateServerConfiguration,
  type DelayedProcessingResponse,
  type FileUploadResponse,
  type ServerConfiguration,
} from './nip96.ts'

describe('validateServerConfiguration', () => {
  it("should return true if 'api_url' is valid URL", () => {
    const config: ServerConfiguration = {
      api_url: 'http://example.com',
    }

    expect(validateServerConfiguration(config)).toBe(true)
  })

  it("should return false if 'api_url' is empty", () => {
    const config: ServerConfiguration = {
      api_url: '',
    }

    expect(validateServerConfiguration(config)).toBe(false)
  })

  it("should return false if both 'api_url' and 'delegated_to_url' are provided", () => {
    const config: ServerConfiguration = {
      api_url: 'http://example.com',
      delegated_to_url: 'http://example.com',
    }

    expect(validateServerConfiguration(config)).toBe(false)
  })
})

describe('readServerConfig', () => {
  it('should return a valid ServerConfiguration object', async () => {
    // setup mock server
    const HTTPROUTE = '/.well-known/nostr/nip96.json' as const
    const validConfig: ServerConfiguration = {
      api_url: 'http://example.com',
    }
    const handler = http.get(`http://example.com${HTTPROUTE}`, () => {
      return HttpResponse.json(validConfig)
    })
    const server = setupServer(handler)
    server.listen()

    const result = await readServerConfig('http://example.com/')

    expect(result).toEqual(validConfig)

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error if response is not valid', async () => {
    // setup mock server
    const HTTPROUTE = '/.well-known/nostr/nip96.json' as const
    const invalidConfig = {
      // missing api_url
    }
    const handler = http.get(`http://example.com${HTTPROUTE}`, () => {
      return HttpResponse.json(invalidConfig)
    })
    const server = setupServer(handler)
    server.listen()

    expect(readServerConfig('http://example.com/')).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error if response is not proper json', async () => {
    // setup mock server
    const HTTPROUTE = '/.well-known/nostr/nip96.json' as const
    const handler = http.get(`http://example.com${HTTPROUTE}`, () => {
      return HttpResponse.json(null)
    })
    const server = setupServer(handler)
    server.listen()

    expect(readServerConfig('http://example.com/')).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error if response status is not 200', async () => {
    // setup mock server
    const HTTPROUTE = '/.well-known/nostr/nip96.json' as const
    const handler = http.get(`http://example.com${HTTPROUTE}`, () => {
      return new HttpResponse(null, { status: 400 })
    })
    const server = setupServer(handler)
    server.listen()

    expect(readServerConfig('http://example.com/')).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error if input url is not valid', async () => {
    expect(readServerConfig('invalid-url')).rejects.toThrow()
  })
})

describe('validateFileUploadResponse', () => {
  it('should return true if response is valid', () => {
    const mockResponse: FileUploadResponse = {
      status: 'error',
      message: 'File uploaded failed',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(true)
  })

  it('should return false if status is undefined', () => {
    const mockResponse: Omit<FileUploadResponse, 'status'> = {
      // status: 'error',
      message: 'File upload failed',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if message is undefined', () => {
    const mockResponse: Omit<FileUploadResponse, 'message'> = {
      status: 'error',
      // message: 'message',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if status is not valid', () => {
    const mockResponse = {
      status: 'something else',
      message: 'message',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if "message" is not a string', () => {
    const mockResponse = {
      status: 'error',
      message: 123,
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if status is "processing" and "processing_url" is undefined', () => {
    const mockResponse = {
      status: 'processing',
      message: 'message',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if status is "processing" and "processing_url" is not a string', () => {
    const mockResponse = {
      status: 'processing',
      message: 'message',
      processing_url: 123,
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if status is "success" and "nip94_event" is undefined', () => {
    const mockResponse = {
      status: 'success',
      message: 'message',
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if "nip94_event" tags are invalid', () => {
    const mockResponse = {
      status: 'success',
      message: 'message',
      nip94_event: {
        tags: [
          // missing url
          ['ox', '719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b'],
        ],
      },
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return false if "nip94_event" tags are empty', () => {
    const mockResponse = {
      status: 'success',
      message: 'message',
      nip94_event: {
        tags: [],
      },
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(false)
  })

  it('should return true if "nip94_event" tags are valid', () => {
    const mockResponse = {
      status: 'success',
      message: 'message',
      nip94_event: {
        tags: [
          ['url', 'http://example.com'],
          ['ox', '719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b'],
        ],
      },
    }

    const result = validateFileUploadResponse(mockResponse)

    expect(result).toBe(true)
  })
})

describe('uploadFile', () => {
  it('should return a valid FileUploadResponse object', async () => {
    // setup mock server
    const validFileUploadResponse: FileUploadResponse = {
      status: 'success',
      message: 'message',
      nip94_event: {
        content: '',
        tags: [
          ['url', 'http://example.com'],
          ['ox', '719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b'],
        ],
      },
    }
    const handler = http.post('http://example.com/upload', () => {
      return HttpResponse.json(validFileUploadResponse, { status: 200 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    const result = await uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)

    expect(result).toEqual(validFileUploadResponse)

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw a proper error if response status is 413', async () => {
    // setup mock server
    const handler = http.post('http://example.com/upload', () => {
      return new HttpResponse(null, { status: 413 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)).rejects.toThrow('File too large!')

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw a proper error if response status is 400', async () => {
    // setup mock server
    const handler = http.post('http://example.com/upload', () => {
      return new HttpResponse(null, { status: 400 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)).rejects.toThrow(
      'Bad request! Some fields are missing or invalid!',
    )

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw a proper error if response status is 403', async () => {
    // setup mock server
    const handler = http.post('http://example.com/upload', () => {
      return new HttpResponse(null, { status: 403 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)).rejects.toThrow(
      'Forbidden! Payload tag does not match the requested file!',
    )

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw a proper error if response status is 402', async () => {
    // setup mock server
    const handler = http.post('http://example.com/upload', () => {
      return new HttpResponse(null, { status: 402 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)).rejects.toThrow('Payment required!')

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw a proper error if response status is not 200, 400, 402, 403, 413', async () => {
    // setup mock server
    const handler = http.post('http://example.com/upload', () => {
      return new HttpResponse(null, { status: 500 })
    })
    const server = setupServer(handler)
    server.listen()

    const file = new File(['hello world'], 'hello.txt')
    const serverUploadUrl = 'http://example.com/upload'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(uploadFile(file, serverUploadUrl, nip98AuthorizationHeader)).rejects.toThrow(
      'Unknown error in uploading file!',
    )

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })
})

describe('generateDownloadUrl', () => {
  it('should generate a download URL without file extension', () => {
    const fileHash = 'abc123'
    const serverDownloadUrl = 'http://example.com/download'
    const expectedUrl = 'http://example.com/download/abc123'

    const result = generateDownloadUrl(fileHash, serverDownloadUrl)

    expect(result).toBe(expectedUrl)
  })

  it('should generate a download URL with file extension', () => {
    const fileHash = 'abc123'
    const serverDownloadUrl = 'http://example.com/download'
    const fileExtension = '.jpg'
    const expectedUrl = 'http://example.com/download/abc123.jpg'

    const result = generateDownloadUrl(fileHash, serverDownloadUrl, fileExtension)

    expect(result).toBe(expectedUrl)
  })
})

describe('deleteFile', () => {
  it('should return a basic json response for successful delete', async () => {
    // setup mock server
    const handler = http.delete('http://example.com/delete/abc123', () => {
      return HttpResponse.json({ status: 'success', message: 'File deleted.' }, { status: 200 })
    })
    const server = setupServer(handler)
    server.listen()

    const fileHash = 'abc123'
    const serverDeleteUrl = 'http://example.com/delete'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    const result = await deleteFile(fileHash, serverDeleteUrl, nip98AuthorizationHeader)

    expect(result).toEqual({ status: 'success', message: 'File deleted.' })

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error for unsuccessful delete', async () => {
    // setup mock server
    const handler = http.delete('http://example.com/delete/abc123', () => {
      return new HttpResponse(null, { status: 400 })
    })
    const server = setupServer(handler)
    server.listen()

    const fileHash = 'abc123'
    const serverDeleteUrl = 'http://example.com/delete'
    const nip98AuthorizationHeader = 'Nostr abcabc'

    expect(deleteFile(fileHash, serverDeleteUrl, nip98AuthorizationHeader)).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })
})

describe('validateDelayedProcessingResponse', () => {
  it('should return false for non-object input', () => {
    expect(validateDelayedProcessingResponse('not an object')).toBe(false)
  })

  it('should return false for null input', () => {
    expect(validateDelayedProcessingResponse(null)).toBe(false)
  })

  it('should return false for object missing required properties', () => {
    const missingStatus: Omit<DelayedProcessingResponse, 'status'> = {
      // missing status
      message: 'test',
      percentage: 50,
    }
    const missingMessage: Omit<DelayedProcessingResponse, 'message'> = {
      status: 'processing',
      // missing message
      percentage: 50,
    }
    const missingPercentage: Omit<DelayedProcessingResponse, 'percentage'> = {
      status: 'processing',
      message: 'test',
      // missing percentage
    }

    expect(validateDelayedProcessingResponse(missingStatus)).toBe(false)
    expect(validateDelayedProcessingResponse(missingMessage)).toBe(false)
    expect(validateDelayedProcessingResponse(missingPercentage)).toBe(false)
  })

  it('should return false for invalid status', () => {
    expect(validateDelayedProcessingResponse({ status: 'invalid', message: 'test', percentage: 50 })).toBe(false)
  })

  it('should return false for non-string message', () => {
    expect(validateDelayedProcessingResponse({ status: 'processing', message: 123, percentage: 50 })).toBe(false)
  })

  it('should return false for non-number percentage', () => {
    expect(validateDelayedProcessingResponse({ status: 'processing', message: 'test', percentage: '50' })).toBe(false)
  })

  it('should return false for percentage out of range', () => {
    expect(validateDelayedProcessingResponse({ status: 'processing', message: 'test', percentage: 150 })).toBe(false)
  })

  it('should return true for valid input', () => {
    expect(validateDelayedProcessingResponse({ status: 'processing', message: 'test', percentage: 50 })).toBe(true)
  })
})

describe('checkFileProcessingStatus', () => {
  it('should throw an error if response is not ok', async () => {
    // setup mock server
    const handler = http.get('http://example.com/status/abc123', () => {
      return new HttpResponse(null, { status: 400 })
    })
    const server = setupServer(handler)
    server.listen()

    const processingUrl = 'http://example.com/status/abc123'

    expect(checkFileProcessingStatus(processingUrl)).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should throw an error if response is not a valid json', async () => {
    // setup mock server
    const handler = http.get('http://example.com/status/abc123', () => {
      return HttpResponse.text('not a json', { status: 200 })
    })
    const server = setupServer(handler)
    server.listen()

    const processingUrl = 'http://example.com/status/abc123'

    expect(checkFileProcessingStatus(processingUrl)).rejects.toThrow()

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should return a valid DelayedProcessingResponse object if response status is 200', async () => {
    // setup mock server
    const validDelayedProcessingResponse: DelayedProcessingResponse = {
      status: 'processing',
      message: 'test',
      percentage: 50,
    }
    const handler = http.get('http://example.com/status/abc123', () => {
      return HttpResponse.json(validDelayedProcessingResponse, { status: 200 })
    })
    const server = setupServer(handler)
    server.listen()

    const processingUrl = 'http://example.com/status/abc123'

    const result = await checkFileProcessingStatus(processingUrl)

    expect(result).toEqual(validDelayedProcessingResponse)

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })

  it('should return a valid FileUploadResponse object if response status is 201', async () => {
    // setup mock server
    const validFileUploadResponse: FileUploadResponse = {
      status: 'success',
      message: 'message',
      nip94_event: {
        content: '',
        tags: [
          ['url', 'http://example.com'],
          ['ox', '719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b'],
        ],
      },
    }
    const handler = http.get('http://example.com/status/abc123', () => {
      return HttpResponse.json(validFileUploadResponse, { status: 201 })
    })
    const server = setupServer(handler)
    server.listen()

    const processingUrl = 'http://example.com/status/abc123'

    const result = await checkFileProcessingStatus(processingUrl)

    expect(result).toEqual(validFileUploadResponse)

    // cleanup mock server
    server.resetHandlers()
    server.close()
  })
})

describe('generateFSPEventTemplate', () => {
  it('should generate FSP event template', () => {
    const serverUrls = ['http://example.com', 'https://example.org']
    const eventTemplate = generateFSPEventTemplate(serverUrls)

    expect(eventTemplate.kind).toBe(FileServerPreference)
    expect(eventTemplate.content).toBe('')
    expect(eventTemplate.tags).toEqual([
      ['server', 'http://example.com'],
      ['server', 'https://example.org'],
    ])
    expect(typeof eventTemplate.created_at).toBe('number')
  })

  it('should filter invalid server URLs', () => {
    const serverUrls = ['http://example.com', 'invalid-url', 'https://example.org']
    const eventTemplate = generateFSPEventTemplate(serverUrls)

    expect(eventTemplate.tags).toEqual([
      ['server', 'http://example.com'],
      ['server', 'https://example.org'],
    ])
  })

  it('should handle empty server URLs', () => {
    const serverUrls: string[] = []
    const eventTemplate = generateFSPEventTemplate(serverUrls)

    expect(eventTemplate.tags).toEqual([])
  })
})

describe('calculateFileHash', () => {
  it('should calculate file hash', async () => {
    const file = new File(['hello world'], 'hello.txt')
    const hash = await calculateFileHash(file)

    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('should calculate file hash with empty file', async () => {
    const file = new File([], 'empty.txt')
    const hash = await calculateFileHash(file)

    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
