import { Property } from '../data/properties';
import { PropertyFilters } from '../state/usePropertyFilters';

export function filterProperties(items: Property[], filters: PropertyFilters): Property[] {
  return items.filter((property) => {
    if (filters.search) {
      const term = filters.search.toLowerCase();
      if (
        !property.title.toLowerCase().includes(term) &&
        !property.address.toLowerCase().includes(term) &&
        !property.city.toLowerCase().includes(term) &&
        !property.state.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    if (filters.city !== 'all' && property.city !== filters.city) return false;
    if (filters.type !== 'all' && property.type !== filters.type) return false;
    if (filters.availableOnly && !property.available) return false;
    if (filters.favoritesOnly && !filters.favorites.includes(property.id)) return false;
    if (property.price < filters.priceMin || property.price > filters.priceMax) return false;
    if (filters.bedrooms !== 'any') {
      if (filters.bedrooms === '4+' && property.beds < 4) return false;
      if (filters.bedrooms !== '4+' && property.beds !== Number(filters.bedrooms)) return false;
    }
    return true;
  });
}

export type SortKey = 'price-asc' | 'price-desc' | 'rating-desc' | 'bedrooms-desc';

export function sortProperties(items: Property[], sort: SortKey): Property[] {
  const sorted = [...items];
  switch (sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      sorted.sort((a, b) => {
        if (b.rating === a.rating) {
          return a.price - b.price;
        }
        return b.rating - a.rating;
      });
      break;
    case 'bedrooms-desc':
      sorted.sort((a, b) => {
        if (b.beds === a.beds) {
          return a.price - b.price;
        }
        return b.beds - a.beds;
      });
      break;
    default:
      break;
  }
  return sorted;
}
