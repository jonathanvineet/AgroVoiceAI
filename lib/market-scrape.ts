import axios from 'axios'
import { JSDOM } from 'jsdom'

import { getCache, putCache, savePriceSnapshot } from './data'
import { parseItems } from './utils'

export type MarketType = 'vegetables' | 'fruits'

function scrapeDataFromTables(html: string) {
  const document = new JSDOM(html).window.document
  const scrapedData: string[] = []
  document.querySelectorAll('table').forEach(table => {
    table.querySelectorAll('tr').forEach(row => {
      const rowData: string[] = []
      row.querySelectorAll('td').forEach(cell => {
        rowData.push(cell.textContent?.trim() || '')
      })
      scrapedData.push(rowData.join(', '))
    })
  })
  return scrapedData
}

export function toPrice(value: string) {
  return parseFloat(String(value).replace(/[₹,\s]/g, '').replace(/^Rs\.?/i, ''))
}

/**
 * Scrapes today's district price table. On success the rows are cached and a
 * daily price snapshot is stored (feeds the Insights chart). When the site is
 * unreachable the last cached table is returned with `offline: true`.
 */
export async function scrapeMarket(location: string, type: MarketType) {
  const websiteUrl = `https://market.todaypricerates.com/${location}-${type}-price-in-Tamil-Nadu`
  const cacheKey = `market:${type}:${location}`

  try {
    const response = await axios.get(websiteUrl, { timeout: 10000 })
    const scrapedData = scrapeDataFromTables(response.data)
    if (scrapedData.some(row => row.trim())) {
      putCache(cacheKey, scrapedData)
      const items = parseItems(scrapedData).map(i => ({
        name: i.name,
        marketPrice: toPrice(i.marketPrice)
      }))
      savePriceSnapshot(location, type, items).catch(error =>
        console.warn('[scrape] price snapshot failed:', error?.message)
      )
    }
    return { scrapedData, offline: false as const }
  } catch (error: any) {
    console.warn(`[scrape] ${websiteUrl} failed:`, error?.message)
    const cached = getCache<string[]>(cacheKey)
    if (cached) {
      return { scrapedData: cached.value, offline: true as const, savedAt: cached.saved_at }
    }
    throw error
  }
}
