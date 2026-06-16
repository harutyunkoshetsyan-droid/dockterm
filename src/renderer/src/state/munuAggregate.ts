// munu state + aggregation. The pure logic lives in @shared/munu so the main
// process (overlay/global aggregation) and renderer share one implementation.
// 'done' is a transient celebration state derived in the store (idle→done settle).
import type { MunuState } from '@shared/types'

export type { MunuState }
export { aggregate } from '@shared/munu'
