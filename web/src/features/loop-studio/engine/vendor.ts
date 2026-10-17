/**
 * Tredjepartsbiblioteker fra egen vert (/vendor, samme filer og SHA-384 som media-lab/build/vendor-lock.json).
 * Lastes først når de trengs: QR-koder, tekstgjenkjenning (OCR) og MP4-pakking.
 */
export interface QrCode { addData(s: string): void; make(): void; getModuleCount(): number; isDark(r: number, c: number): boolean; createDataURL(cell?: number, margin?: number): string }
export interface QrFactory {
  (type: number, level: string): QrCode
  stringToBytes?: unknown
  stringToBytesFuncs?: Record<string, unknown>
}
export interface TesseractLib {
  recognize(img: HTMLCanvasElement, lang: string, o: { workerPath: string; corePath: string; langPath: string; logger: (m: { status: string; progress: number }) => void }): Promise<{ data: { text: string } }>
}
export interface Mp4Muxer {
  addVideoChunk(c: EncodedVideoChunk, m?: EncodedVideoChunkMetadata): void
  addAudioChunk(c: EncodedAudioChunk, m?: EncodedAudioChunkMetadata): void
  finalize(): void
}
export interface MuxerLib {
  ArrayBufferTarget: new () => { buffer: ArrayBuffer }
  Muxer: new (o: {
    target: { buffer: ArrayBuffer }
    fastStart: 'in-memory'
    firstTimestampBehavior: 'offset'
    video: { codec: string; width: number; height: number; frameRate: number }
    audio?: { codec: string; numberOfChannels: number; sampleRate: number }
  }) => Mp4Muxer
}

const loaded = new Map<string, Promise<unknown>>()
function load<T>(src: string, sri: string, global: string): Promise<T> {
  const w = window as unknown as Record<string, unknown>
  if (w[global]) return Promise.resolve(w[global] as T)
  let p = loaded.get(src) as Promise<T> | undefined
  if (!p) {
    p = new Promise<T>((res, rej) => {
      const sc = document.createElement('script')
      sc.src = src
      sc.integrity = sri
      sc.crossOrigin = 'anonymous'
      sc.onload = () => (w[global] ? res(w[global] as T) : rej(new Error('load')))
      sc.onerror = () => {
        loaded.delete(src)
        rej(new Error('load'))
      }
      document.head.appendChild(sc)
    })
    loaded.set(src, p)
  }
  return p
}

export const loadQr = () => load<QrFactory>('/vendor/qrcode-generator-1.4.4/qrcode.js', 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k', 'qrcode')
export const loadTesseract = () => load<TesseractLib>('/vendor/tesseract-5.1.1/tesseract.min.js', 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F', 'Tesseract')
export const loadMuxer = () => load<MuxerLib>('/vendor/mp4-muxer-5.1.3/mp4-muxer.js', 'sha384-SujebcgqCNlLMRSnVkLD+3eWOzsxobv30Bct+0lV+fc1EHHEuvcePwmDgMzpnptj', 'Mp4Muxer')
