import type {
  Category,
  MunicipalityRecord,
  ProvinceData,
  SearchResult,
  Statistic,
} from '@/types'

export interface AppDataProvider {
  getCategories(): Promise<Category[]>
  getStatistics(): Promise<Statistic[]>
  getProvinces(): Promise<ProvinceData[]>
  getMunicipalities(): Promise<MunicipalityRecord[]>
  getCategoryById(id: string): Promise<Category | undefined>
  getStatById(id: string): Promise<Statistic | undefined>
  getStatsByIds(ids: string[]): Promise<Statistic[]>
  getStatsByCategory(categoryId: string): Promise<Statistic[]>
  getFeaturedStats(): Promise<Statistic[]>
  searchAll(query: string): Promise<SearchResult[]>
}
