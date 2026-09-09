import NodeCache from 'node-cache';

// Cache em memória simples. TTL padrão de 15 minutos.
export const cache = new NodeCache({ stdTTL: 60 * 15, checkperiod: 120 });
