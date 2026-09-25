export const simpatizantesEndpoint = '/api/simpatizantes'

export function simpatizantesUrl(query = 'limit=1000') {
  return `${simpatizantesEndpoint}?${query}`
}
