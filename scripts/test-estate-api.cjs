const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
let requestedUrl;
let databaseOptions;
let requestedMethod;
let requestCount = 0;
const mocks = {
  'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
  '@neup/core/database/prisma': { Prisma: { validator: () => (value) => value }, prisma: {} },
  '@/types': { PropertyFiltersSchema: { omit: () => ({ safeParse: (data) => ({ success: true, data }) }) } },
  '@/services/property': { getPaginatedProperties: async (options) => { databaseOptions = options; return { properties: [], totalCount: 49 }; } },
  '@/services/property-posting-context': {},
};
function load(filename) {
  filename = path.resolve(root, filename);
  if (!path.extname(filename)) filename = fs.existsSync(`${filename}.ts`) ? `${filename}.ts` : path.join(filename, 'index.ts');
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@neup/')) return load(`.neup/${name.slice(6)}`);
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
    return require(name);
  };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: localRequire, URL, Headers, Response, console,
    fetch: async (url, options) => {
      requestCount += 1;
      requestedMethod = options?.method;
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({ success: true, properties: [] }), { status: 200 });
    },
  }, { filename });
  return module.exports;
}
async function main() {
  const { properties } = load('.neup/logica/estate/properties');
  await properties.get({ limit: 12, page: 3, purpose: ['Sale', 'Rent'], type: 'House', nature: 'Residential', orderBy: 'oldestFirst' });
  assert.equal(requestedUrl.pathname, '/estate/bridge/api.v1/properties');
  for (const [key, value] of Object.entries({ limit: '12', offset: '24', purpose: 'Sale,Rent', category: 'House', type: 'Residential', orderBy: 'oldestFirst' })) {
    assert.equal(requestedUrl.searchParams.get(key), value, key);
  }
  await properties.get({ limit: 1000, page: 4, offset: 7 });
  assert.equal(requestedUrl.searchParams.get('limit'), '100');
  assert.equal(requestedUrl.searchParams.get('offset'), '7');
  await properties.get({ limit: NaN, page: -1, offset: -1 });
  assert.equal(requestedUrl.searchParams.get('limit'), '25');
  assert.equal(requestedUrl.searchParams.get('offset'), '0');
  for (const [scope, value, queryKey] of [['agency', 'agency-1', 'agency'], ['agent', 'agent-1', 'agent'], ['purpose', 'Sale', 'purpose'], ['type', 'House', 'category'], ['nature', 'Commercial', 'type']]) {
    await properties[scope](value).get({ limit: 12, offset: 12 });
    assert.equal(requestedUrl.searchParams.get(queryKey), value);
    assert.equal(requestedUrl.searchParams.get('offset'), '12');
  }
  const before = requestCount;
  const filters = [{ type: 'House' }, { purpose: ['Sale'], agency: 'agency-1' }];
  const base = properties.filter(filters);
  const pageOne = base.paginate(0, 12);
  const pageTwo = base.paginate(12, 12);
  filters[1].purpose.push('Rent');
  assert.equal(requestCount, before, 'Building a chain must not fetch');
  await pageTwo.get();
  assert.equal(requestedUrl.searchParams.get('offset'), '12');
  assert.equal(requestedUrl.searchParams.get('purpose'), 'Sale');
  await pageOne.get();
  assert.equal(requestedUrl.searchParams.get('offset'), '0');
  await properties.paginate(24, 12).filter({ purpose: 'Rent' }).get();
  assert.equal(requestedUrl.searchParams.get('offset'), '24');
  assert.equal(requestedUrl.searchParams.get('purpose'), 'Rent');
  await properties.agency('locked-agency').filter({ agency: 'another', type: 'House' }).paginate(12, 12).get();
  assert.equal(requestedUrl.searchParams.get('agency'), 'locked-agency');
  for (const domain of ['agents', 'agencies']) {
    const collection = load(`.neup/logica/estate/${domain}`)[domain];
    const relation = domain === 'agents' ? 'agency' : 'agent';
    await collection.filter([{ name: 'Example' }, { query: 'lookup' }, { [relation]: 'related-account' }]).paginate(10, 5).get();
    assert.equal(requestedUrl.pathname, `/estate/bridge/api.v1/${domain}`);
    assert.equal(requestedUrl.searchParams.get('name'), 'Example');
    assert.equal(requestedUrl.searchParams.get(relation), 'related-account');
    assert.equal(requestedUrl.searchParams.get('offset'), '10');
    assert.equal(requestedUrl.searchParams.get('limit'), '5');
    await collection.paginate(-1, Infinity).get();
    assert.equal(requestedUrl.searchParams.get('offset'), '0');
    assert.equal(requestedUrl.searchParams.get('limit'), '10');
    await collection.paginate(0, 100).get();
    assert.equal(requestedUrl.searchParams.get('limit'), '25');
  }
  const { agent } = load('.neup/logica/estate/agent');
  await agent('agent-2').property.list({ limit: 12, offset: 24 });
  assert.equal(requestedUrl.searchParams.get('agent'), 'agent-2');
  assert.equal(requestedUrl.searchParams.get('offset'), '24');
  await agent('agent-2').get();
  assert.equal(requestedUrl.searchParams.get('agentId'), 'agent-2');
  await agent('agent-2').property('property-1').assign();
  assert.equal(requestedMethod, 'POST');
  await agent('agent-2').user('user-1').visit.status('pending').list();
  assert.equal(requestedMethod, 'GET');
  for (const [key, value] of Object.entries({ agentId: 'agent-2', userId: 'user-1', status: 'pending' })) {
    assert.equal(requestedUrl.searchParams.get(key), value);
  }
  const { handleBridgePropertySearch } = load('services/bridge-property-service.ts');
  for (const [query, limit, offset] of [
    ['limit=12&page=3', 12, 24], ['limit=12&page=3&offset=5', 12, 5],
    ['', 25, 0], ['limit=500&offset=100', 100, 100], ['limit=-2&page=-1&offset=bad', 25, 0],
  ]) {
    const response = await handleBridgePropertySearch({ nextUrl: new URL(`https://example.test/properties?${query}`) });
    assert.equal(databaseOptions.limit, limit);
    assert.equal(databaseOptions.offset, offset);
    assert.equal(response.body.limit, limit);
    assert.equal(response.body.offset, offset);
    assert.equal(response.body.totalPages, Math.ceil(49 / limit));
  }
  let prismaOptions;
  mocks['@neup/core/database/prisma'].prisma.property = {
    count: async () => 0,
    findMany: async (options) => { prismaOptions = options; return []; },
  };
  mocks['@/services/problem-service'] = { logProblem: (error) => { throw error; } };
  mocks['@/inapp/database/adapters'] = { mapTypeToEnum: (value) => value.toUpperCase() };
  mocks['./shared'] = {
    PROPERTY_STATUS: { ACTIVE: 'ACTIVE' }, PROPERTY_INCLUDE: {},
    hydratePropertyAccountLabels: async (records) => records, mapRecord: (record) => record,
  };
  const { getPaginatedProperties } = load('services/properties/list.ts');
  for (const [nature, categories] of [
    ['Commercial', ['COMMERCIAL']], ['Residential', ['HOUSE', 'APARTMENT', 'LAND']], ['Industrial', []],
  ]) {
    await getPaginatedProperties({ limit: 12, offset: 24, filters: { category: ['House'], type: [nature] } });
    assert.equal(prismaOptions.take, 12);
    assert.equal(prismaOptions.skip, 24);
    assert.equal(JSON.stringify(prismaOptions.where.type.in), JSON.stringify(['HOUSE']));
    assert.equal(JSON.stringify(prismaOptions.where.AND[0].type.in), JSON.stringify(categories));
  }
  mocks['@/services/site-dev-log-service'] = { withRequestDevLog: (_, handler) => handler };
  mocks['./problem-service'] = mocks['@/services/problem-service'];
  for (const [domain, serviceName, listName, countName, relation] of [
    ['agents', 'agent-service', 'getAgents', 'getAgentCount', 'agency'],
    ['agencies', 'agency-service', 'getPublicAgencyAccounts', 'getPublicAgencyAccountCount', 'agent'],
  ]) {
    let listOptions, countFilters;
    mocks[`@/services/${serviceName}`] = {
      [listName]: async (options) => { listOptions = options; return [{ id: 'one' }]; },
      [countName]: async (filters) => { countFilters = filters; return 20; },
    };
    const { GET } = load(`app/bridge/api.v1/${domain}/route.ts`);
    const response = await GET({ nextUrl: new URL(`https://example.test/${domain}?name=Example&${relation}=linked&limit=5&offset=10`) });
    assert.equal(listOptions.filters.name, 'Example');
    assert.equal(listOptions.filters[relation], 'linked');
    assert.equal(JSON.stringify(listOptions.filters), JSON.stringify(countFilters));
    assert.equal(response.body.pagination.total, 20);
    assert.equal(response.body.pagination.hasMore, true);
    await GET({ nextUrl: new URL(`https://example.test/${domain}?limit=1.5&offset=Infinity`) });
    assert.equal(listOptions.limit, 10);
    assert.equal(listOptions.offset, 0);
    let rowOptions, countOptions;
    mocks['@neup/core/database/prisma'].prisma.account = {
      findMany: async (options) => { rowOptions = options; return []; },
      count: async (options) => { countOptions = options; return 0; },
    };
    const service = load(`services/${serviceName}.ts`);
    const filters = { name: 'Example', search: 'handle', [relation]: 'linked' };
    await service[listName]({ limit: 5, offset: 10, filters });
    await service[countName](filters);
    assert.equal(JSON.stringify(rowOptions.where), JSON.stringify(countOptions.where));
    assert.equal(rowOptions.take, 5);
    assert.equal(rowOptions.skip, 10);
    const relationKey = domain === 'agents' ? 'agencyAgentMapAsAgent' : 'agencyAgentMapAsAgency';
    assert.equal(rowOptions.where[relationKey].some[`${relation}Id`], 'linked');
    assert.equal(rowOptions.where[relationKey].some.status, 'accepted');
  }
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const samplePath = path.join(root, '__estate_fluent_typecheck__.ts');
  const source = `import { logica } from '@neup/logica';
    logica.estate.properties.filter([{type: 'House'}, {purpose: ['Sale'], agent: 'a', agency: 'b'}]).paginate(0,12).get();
    logica.estate.properties.paginate(0,12).filter({purpose: 'Sale'}).get();
    logica.estate.properties.agency('id').filter({type: 'House'}).paginate(12,12).get();
    logica.estate.agents.filter([{agency: 'id'}, {name: 'Agent'}]).paginate(0,10).get();
    logica.estate.agencies.paginate(0,10).filter({agent: 'id'}).get();`;
  const host = ts.createCompilerHost(parsed.options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (file, lang, onError, create) => file === samplePath
    ? ts.createSourceFile(file, source, lang, true)
    : getSourceFile(file, lang, onError, create);
  const program = ts.createProgram([samplePath], { ...parsed.options, incremental: false }, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  console.log('Estate fluent API types, immutable chains, all collection routes, and database pagination checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
