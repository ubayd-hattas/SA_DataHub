import type {
  Category,
  MunicipalityRecord,
  ProvinceData,
  SearchResult,
  Statistic,
} from '@/types'
import type { AppDataProvider } from './types'
import { intelligentSearch } from '@/lib/search'

const FEATURED_IDS = [
  'unemployment-national',
  'gdp-growth',
  'cpi-headline',
  'population-total',
  'matric-pass-rate',
  'murder-rate',
]

function getDatasetRegistryLazy() {
  // Lazy require avoids pulling registry into module initialisation paths.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/registry').datasetRegistry
}

export function searchAllWithData(
  query: string,
  statistics: Statistic[],
  provinces: ProvinceData[],
  categories: Category[]
): SearchResult[] {
  return intelligentSearch(query, statistics, provinces, categories, getDatasetRegistryLazy())
}

export function createInMemoryProvider({
  categories,
  statistics,
  provinces,
  municipalities,
}: {
  categories: Category[]
  statistics: Statistic[]
  provinces: ProvinceData[]
  municipalities: MunicipalityRecord[]
}): AppDataProvider {
  return {
    async getCategories() {
      return categories
    },
    async getStatistics() {
      return statistics
    },
    async getProvinces() {
      return provinces
    },
    async getMunicipalities() {
      return municipalities
    },
    async getCategoryById(id) {
      return categories.find((category) => category.id === id)
    },
    async getStatById(id) {
      return statistics.find((stat) => stat.id === id)
    },
    async getStatsByIds(ids) {
      return ids
        .map((id) => statistics.find((stat) => stat.id === id))
        .filter((stat): stat is Statistic => stat !== undefined)
    },
    async getStatsByCategory(categoryId) {
      return statistics.filter((stat) => stat.categoryId === categoryId)
    },
    async getFeaturedStats() {
      return FEATURED_IDS
        .map((id) => statistics.find((stat) => stat.id === id))
        .filter((stat): stat is Statistic => stat !== undefined)
    },
    async searchAll(query) {
      return searchAllWithData(query, statistics, provinces, categories)
    },
  }
}
