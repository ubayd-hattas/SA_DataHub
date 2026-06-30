import {
  categories,
  statistics,
  provinces,
  municipalities,
} from '@/data/mock'
import { createInMemoryProvider } from './utils'

export function createJsonAppDataProvider() {
  return createInMemoryProvider({
    categories,
    statistics,
    provinces,
    municipalities,
  })
}
